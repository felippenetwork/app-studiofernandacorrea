import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PostComment } from '../../types';
import { postsService } from '../../services/api/posts';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';

interface CommentsSheetProps {
  postId: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CommentsSheet({ postId, onClose, onCommentAdded }: CommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!postId) return;
    setComments([]);
    setIsLoading(true);
    postsService.getComments(postId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [postId]);

  const handleSend = async () => {
    if (!commentText.trim() || !postId || isSending) return;
    setIsSending(true);
    const text = commentText.trim();
    setCommentText('');
    try {
      const newComment = await postsService.addComment(postId, text);
      setComments((prev) => [...prev, newComment]);
      onCommentAdded?.();
    } catch (err: any) {
      setCommentText(text);
      const msg: string =
        err?.response?.data?.message ??
        (err?.response?.status ? 'Não foi possível enviar o comentário.' : 'Sem conexão. Verifique sua internet.');
      Alert.alert('Erro', msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={!!postId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[2] }]}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Comentários</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* List */}
            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => <CommentItem comment={item} />}
                ListEmptyComponent={
                  <Text style={styles.empty}>Sem comentários ainda. Seja o primeiro!</Text>
                }
                contentContainerStyle={styles.listContent}
                style={styles.list}
              />
            )}

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Adicione um comentário..."
                placeholderTextColor={colors.textTertiary}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!commentText.trim() || isSending}
                style={[styles.sendBtn, (!commentText.trim() || isSending) && styles.sendBtnDisabled]}
                activeOpacity={0.8}
              >
                {isSending
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="send" size={16} color="white" />
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CommentItem({ comment }: { comment: PostComment }) {
  return (
    <View style={cStyles.row}>
      <View style={cStyles.avatar}>
        <Text style={cStyles.initials}>{initials(comment.userName)}</Text>
      </View>
      <View style={cStyles.content}>
        <View style={cStyles.nameRow}>
          <Text style={cStyles.name}>{comment.userName}</Text>
          <Text style={cStyles.time}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={cStyles.text}>{comment.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 280,
    ...shadows.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { ...textStyles.h3, color: colors.textPrimary },
  loaderContainer: { height: 100, alignItems: 'center', justifyContent: 'center' },
  list: { maxHeight: 400 },
  listContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  empty: { ...textStyles.bodyMedium, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing[6] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});

const cStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  initials: { ...textStyles.caption, color: colors.primary, fontWeight: '700' },
  content: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 3 },
  name: { ...textStyles.labelSmall, color: colors.textPrimary },
  time: { ...textStyles.caption, color: colors.textTertiary },
  text: { ...textStyles.bodySmall, color: colors.textSecondary, lineHeight: 20 },
});
