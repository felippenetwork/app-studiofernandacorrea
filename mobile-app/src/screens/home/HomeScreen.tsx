import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Card, Badge } from '../../components/common';
import { FeedPost } from '../../components/feed/FeedPost';
import { CommentsSheet } from '../../components/feed/CommentsSheet';
import { appointmentsService } from '../../services/api/appointments';
import { postsService } from '../../services/api/posts';
import { Post, HomeStackParamList } from '../../types';
import {
  formatDateRelative,
  formatCurrency,
  appointmentStatusLabel,
  appointmentStatusColor,
} from '../../utils/formatters';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: appointmentsService.getMyAppointments,
    staleTime: 1000 * 60 * 2,
  });

const { isLoading: feedLoading, refetch: refetchFeed, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const data = await postsService.getFeed(1);
      setPosts(data);
      setFeedPage(1);
      setHasMore(data.length >= 20);
      return data;
    },
    staleTime: 1000 * 30,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchFeed();
    setIsRefreshing(false);
  }, [refetchFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || feedLoading) return;
    setIsLoadingMore(true);
    try {
      const next = feedPage + 1;
      const more = await postsService.getFeed(next);
      if (more.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => [...prev, ...more]);
        setFeedPage(next);
      }
    } catch {
      // silent — feed stays at current page
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, feedLoading, feedPage]);

  const handleLikeChange = (postId: string, liked: boolean, count: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedByMe: liked, likesCount: count } : p))
    );
  };

  const handleDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleCommentAdded = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );
  };

  const nextAppointment = appointments.find(
    (a) => a.status === 'aguardando_confirmacao' || a.status === 'confirmado' || a.status === 'pendente_pagamento'
  );
  const firstName = user?.name?.split(' ')[0] ?? 'Bem-vinda';

  const ListHeader = (
    <View>
      {/* Top header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <View>
          <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
          <Text style={styles.greetingSub}>Que bom ter você aqui</Text>
        </View>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('Profile', { screen: 'Notifications' })}
          style={styles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Next Appointment */}
      {nextAppointment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximo Agendamento</Text>
          <Card style={styles.nextApptCard} shadow="md">
            <View style={[styles.nextApptAccent, { backgroundColor: appointmentStatusColor(nextAppointment.status) }]} />
            <View style={styles.nextApptContent}>
              <View style={styles.nextApptTop}>
                <Text style={styles.nextApptService}>{nextAppointment.service.name}</Text>
                <Badge
                  label={appointmentStatusLabel(nextAppointment.status)}
                  variant={nextAppointment.status === 'confirmado' ? 'success' : nextAppointment.status === 'aguardando_confirmacao' ? 'warning' : 'warning'}
                />
              </View>
              <View style={styles.nextApptRow}>
                <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.nextApptInfo}>{nextAppointment.professional.name}</Text>
              </View>
              <View style={styles.nextApptRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.nextApptInfo}>
                  {formatDateRelative(nextAppointment.appointmentDate)} · {nextAppointment.appointmentTime}
                </Text>
              </View>
              <View style={styles.nextApptFooter}>
                <Text style={styles.nextApptPrice}>{formatCurrency(nextAppointment.servicePrice)}</Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Feed title */}
      <View style={styles.feedTitleRow}>
        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.feedTitle}>Comunidade</Text>
      </View>

      {/* Post composer box */}
      <TouchableOpacity
        style={styles.composerBox}
        onPress={() => navigation.navigate('PostComposer' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.composerAvatarFallback}>
          <Text style={styles.composerAvatarInitials}>
            {user?.name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'EU'}
          </Text>
        </View>
        <Text style={styles.composerPlaceholder}>Compartilhe sua experiência...</Text>
        <View style={styles.composerActions}>
          <View style={styles.composerActionItem}>
            <Ionicons name="image-outline" size={16} color="#4A90E2" />
          </View>
          <View style={styles.composerActionItem}>
            <Ionicons name="videocam-outline" size={16} color="#E2844A" />
          </View>
          <View style={styles.composerActionItem}>
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPost
            post={item}
            currentUserId={user?.id}
            onLikeChange={handleLikeChange}
            onCommentPress={setSelectedPostId}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          feedLoading ? (
            <View style={styles.feedEmpty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.feedEmpty}>
              <Ionicons name="camera-outline" size={40} color={colors.border} />
              <Text style={styles.feedEmptyText}>
                Ainda não há posts.{'\n'}Seja o primeiro a compartilhar!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <CommentsSheet
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)}
        onCommentAdded={() => selectedPostId && handleCommentAdded(selectedPostId)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: spacing[10] },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  greeting: { ...textStyles.displaySmall, color: colors.textPrimary },
  greetingSub: { ...textStyles.bodySmall, color: colors.textTertiary, marginTop: 4 },
  notifBtn: { padding: spacing[2], position: 'relative' },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5, borderColor: colors.background,
  },

  composerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    padding: spacing[3],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  composerAvatarFallback: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  composerAvatarInitials: { ...textStyles.caption, color: colors.primary, fontWeight: '700' },
  composerPlaceholder: { ...textStyles.bodyMedium, color: colors.textTertiary, flex: 1 },
  composerActions: { flexDirection: 'row', gap: spacing[2] },
  composerActionItem: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { marginHorizontal: spacing[5], marginBottom: spacing[5] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { ...textStyles.h3, color: colors.textPrimary, marginBottom: spacing[3] },
  sectionLink: { ...textStyles.bodySmall, color: colors.primary },

  nextApptCard: { flexDirection: 'row', overflow: 'hidden', padding: 0 },
  nextApptAccent: { width: 4 },
  nextApptContent: { flex: 1, padding: spacing[4] },
  nextApptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  nextApptService: { ...textStyles.h3, color: colors.textPrimary, flex: 1, marginRight: spacing[2] },
  nextApptRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  nextApptInfo: { ...textStyles.bodySmall, color: colors.textSecondary },
  nextApptFooter: { marginTop: spacing[3] },
  nextApptPrice: { ...textStyles.labelLarge, color: colors.primary },

  feedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  feedTitle: { ...textStyles.labelLarge, color: colors.textSecondary },

  feedEmpty: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[8],
  },
  feedEmptyText: {
    ...textStyles.bodyMedium,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingMore: { paddingVertical: spacing[6], alignItems: 'center' },
});
