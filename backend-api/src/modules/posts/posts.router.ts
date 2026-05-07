import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth.middleware';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { AuthenticatedRequest } from '../../types';
import { randomUUID } from 'crypto';

export const postsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens e vídeos são permitidos.'));
    }
  },
});

const PAGE_SIZE = 20;

function mapPost(p: any, userId: string) {
  return {
    id: p.id,
    userId: p.user_id,
    userName: p.user?.name ?? 'Usuário',
    userAvatar: p.user?.avatar_url ?? null,
    text: p.text,
    mediaUrl: p.media_url,
    mediaType: p.media_type,
    likesCount: p.post_likes?.length ?? 0,
    commentsCount: p.post_comments?.length ?? 0,
    likedByMe: p.post_likes?.some((l: any) => l.user_id === userId) ?? false,
    createdAt: p.created_at,
  };
}

// ─── GET /api/posts ───────────────────────────────────────────────────────────
postsRouter.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    if (!hasSupabase) {
      res.json({ data: [] });
      return;
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id, text, media_url, media_type, created_at, user_id,
        user:users!posts_user_id_fkey(id, name, avatar_url),
        post_likes(user_id),
        post_comments(id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    res.json({ data: (posts ?? []).map((p) => mapPost(p, userId)) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── POST /api/posts ──────────────────────────────────────────────────────────
postsRouter.post('/', authMiddleware, upload.single('media'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { text, mediaType } = req.body;

    if (!text?.trim()) {
      res.status(400).json({ error: 'Validation', message: 'Texto é obrigatório.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Validation', message: 'Mídia é obrigatória.' });
      return;
    }
    if (!['photo', 'video', 'boomerang'].includes(mediaType)) {
      res.status(400).json({ error: 'Validation', message: 'Tipo de mídia inválido.' });
      return;
    }

    if (!hasSupabase) {
      res.status(201).json({
        data: {
          id: `post-mock-${Date.now()}`,
          userId,
          userName: 'Você',
          userAvatar: null,
          text: text.trim(),
          mediaUrl: 'https://picsum.photos/seed/new/400/400',
          mediaType,
          likesCount: 0,
          commentsCount: 0,
          likedByMe: false,
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }

    // Only clients with a concluido appointment can post
    const { data: concluido } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'concluido')
      .limit(1)
      .maybeSingle();

    if (!concluido) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Você precisa ter pelo menos um atendimento concluído para publicar.',
      });
      return;
    }

    // Upload to Supabase Storage
    const originalName = req.file.originalname ?? '';
    const ext = originalName.includes('.')
      ? originalName.split('.').pop()
      : req.file.mimetype.startsWith('image/') ? 'jpg' : 'mp4';
    const storagePath = `${userId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(storagePath);

    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: userId, text: text.trim(), media_url: urlData.publicUrl, media_type: mediaType })
      .select(`
        id, text, media_url, media_type, created_at, user_id,
        user:users!posts_user_id_fkey(id, name, avatar_url),
        post_likes(user_id),
        post_comments(id)
      `)
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ data: mapPost(post, userId) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
postsRouter.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    if (!hasSupabase) {
      res.status(204).send();
      return;
    }

    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id, media_url')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!post) {
      res.status(404).json({ error: 'NotFound', message: 'Post não encontrado.' });
      return;
    }
    if (post.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'Sem permissão para excluir este post.' });
      return;
    }

    // Remove media from storage
    const urlParts = (post.media_url as string).split('/post-media/');
    if (urlParts[1]) {
      await supabase.storage.from('post-media').remove([urlParts[1]]).catch(() => {});
    }

    await supabase.from('posts').delete().eq('id', req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── POST /api/posts/:id/like (toggle) ───────────────────────────────────────
postsRouter.post('/:id/like', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const postId = req.params.id;

    if (!hasSupabase) {
      res.json({ data: { liked: true, likesCount: 1 } });
      return;
    }

    const { data: existing } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    }

    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.json({ data: { liked: !existing, likesCount: count ?? 0 } });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── GET /api/posts/:id/comments ─────────────────────────────────────────────
postsRouter.get('/:id/comments', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasSupabase) {
      res.json({ data: [] });
      return;
    }

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id, text, created_at, user_id,
        user:users!post_comments_user_id_fkey(id, name, avatar_url)
      `)
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({
      data: (comments ?? []).map((c: any) => ({
        id: c.id,
        postId: req.params.id,
        userId: c.user_id,
        userName: c.user?.name ?? 'Usuário',
        userAvatar: c.user?.avatar_url ?? null,
        text: c.text,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── POST /api/posts/:id/comments ────────────────────────────────────────────
postsRouter.post('/:id/comments', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const userName = (req as AuthenticatedRequest).user.name;
    const { text } = req.body;

    if (!text?.trim()) {
      res.status(400).json({ error: 'Validation', message: 'Comentário não pode ser vazio.' });
      return;
    }
    if (text.trim().length > 500) {
      res.status(400).json({ error: 'Validation', message: 'Comentário muito longo (máx 500 caracteres).' });
      return;
    }

    if (!hasSupabase) {
      res.status(201).json({
        data: {
          id: `comment-mock-${Date.now()}`,
          postId: req.params.id,
          userId,
          userName,
          userAvatar: null,
          text: text.trim(),
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({ post_id: req.params.id, user_id: userId, text: text.trim() })
      .select(`
        id, text, created_at, user_id,
        user:users!post_comments_user_id_fkey(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      data: {
        id: comment.id,
        postId: req.params.id,
        userId: comment.user_id,
        userName: (comment as any).user?.name ?? 'Usuário',
        userAvatar: (comment as any).user?.avatar_url ?? null,
        text: comment.text,
        createdAt: comment.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
