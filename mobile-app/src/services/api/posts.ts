import { apiClient, USE_MOCK } from './client';
import { Post, PostComment, MediaType } from '../../types';

const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    userId: 'user-1',
    userName: 'Maria Silva',
    text: 'Amei o resultado! Os cílios ficaram perfeitos, me sinto uma diva 😍✨',
    mediaUrl: 'https://picsum.photos/seed/beauty1/400/400',
    mediaType: 'photo',
    likesCount: 8,
    commentsCount: 2,
    likedByMe: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'post-2',
    userId: 'user-2',
    userName: 'Ana Beatriz',
    text: 'Sempre saio renovada! Profissionalismo e carinho em cada detalhe. Recomendo demais 💕',
    mediaUrl: 'https://picsum.photos/seed/beauty2/400/400',
    mediaType: 'photo',
    likesCount: 12,
    commentsCount: 4,
    likedByMe: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

export const postsService = {
  async getFeed(page = 1): Promise<Post[]> {
    if (USE_MOCK) return page === 1 ? MOCK_POSTS : [];
    const { data } = await apiClient.get(`/posts?page=${page}`);
    return data.data;
  },

  async createPost(text: string, mediaUri: string, mediaType: MediaType): Promise<Post> {
    if (USE_MOCK) {
      return {
        id: `post-${Date.now()}`,
        userId: 'me',
        userName: 'Você',
        userAvatar: null,
        text,
        mediaUrl: mediaUri,
        mediaType,
        likesCount: 0,
        commentsCount: 0,
        likedByMe: false,
        createdAt: new Date().toISOString(),
      };
    }

    const ext = mediaUri.split('.').pop() ?? (mediaType === 'photo' ? 'jpg' : 'mp4');
    const mimeType = mediaType === 'photo'
      ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
      : 'video/mp4';

    const formData = new FormData();
    formData.append('text', text);
    formData.append('mediaType', mediaType);
    formData.append('media', { uri: mediaUri, type: mimeType, name: `media.${ext}` } as any);

    const { data } = await apiClient.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async deletePost(postId: string): Promise<void> {
    if (USE_MOCK) return;
    await apiClient.delete(`/posts/${postId}`);
  },

  async toggleLike(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    if (USE_MOCK) return { liked: true, likesCount: 1 };
    const { data } = await apiClient.post(`/posts/${postId}/like`);
    return data.data;
  },

  async getComments(postId: string): Promise<PostComment[]> {
    if (USE_MOCK) return [];
    const { data } = await apiClient.get(`/posts/${postId}/comments`);
    return data.data;
  },

  async addComment(postId: string, text: string): Promise<PostComment> {
    if (USE_MOCK) {
      return {
        id: `comment-${Date.now()}`,
        postId,
        userId: 'me',
        userName: 'Você',
        userAvatar: null,
        text,
        createdAt: new Date().toISOString(),
      };
    }
    const { data } = await apiClient.post(`/posts/${postId}/comments`, { text });
    return data.data;
  },
};
