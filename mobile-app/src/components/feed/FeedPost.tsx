import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { postsService } from '../../services/api/posts';

interface FeedPostProps {
  post: Post;
  currentUserId?: string;
  onLikeChange: (postId: string, liked: boolean, count: number) => void;
  onCommentPress: (postId: string) => void;
  onDelete: (postId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export function FeedPost({ post, currentUserId, onLikeChange, onCommentPress, onDelete }: FeedPostProps) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = currentUserId === post.userId;

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const newLiked = !liked;
    const newCount = likesCount + (newLiked ? 1 : -1);
    setLiked(newLiked);
    setLikesCount(newCount);
    try {
      const result = await postsService.toggleLike(post.id);
      setLikesCount(result.likesCount);
      onLikeChange(post.id, result.liked, result.likesCount);
    } catch {
      setLiked(!newLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleOptions = () => {
    Alert.alert('Post', '', [
      {
        text: 'Excluir post',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Excluir post?', 'Esta ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir',
              style: 'destructive',
              onPress: async () => {
                try {
                  await postsService.deletePost(post.id);
                  onDelete(post.id);
                } catch {
                  Alert.alert('Erro', 'Não foi possível excluir o post.');
                }
              },
            },
          ]),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          {post.userAvatar ? (
            <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials(post.userName)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Text */}
      <Text style={styles.text}>{post.text}</Text>

      {/* Media */}
      <View style={styles.mediaContainer}>
        {post.mediaType === 'photo' ? (
          <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: post.mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={post.mediaType === 'boomerang'}
            isLooping={post.mediaType === 'boomerang'}
            useNativeControls={post.mediaType === 'video'}
            isMuted={post.mediaType === 'boomerang'}
          />
        )}
        {post.mediaType === 'boomerang' && (
          <View style={styles.boomerangBadge}>
            <Ionicons name="refresh-outline" size={12} color="white" />
            <Text style={styles.boomerangBadgeText}>Boomerang</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#E04040' : colors.textTertiary}
          />
          {likesCount > 0 && (
            <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likesCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={() => onCommentPress(post.id)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
          {post.commentsCount > 0 && (
            <Text style={styles.actionCount}>{post.commentsCount}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { ...textStyles.labelSmall, color: colors.primary, fontWeight: '700' },
  userName: { ...textStyles.labelMedium, color: colors.textPrimary },
  timeAgo: { ...textStyles.caption, color: colors.textTertiary },

  text: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    lineHeight: 22,
  },

  mediaContainer: { position: 'relative' },
  media: { width: '100%', aspectRatio: 1 },

  boomerangBadge: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  boomerangBadgeText: { ...textStyles.caption, color: 'white', fontSize: 10 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  actionCount: { ...textStyles.labelSmall, color: colors.textTertiary },
  actionCountLiked: { color: '#E04040' },
});
