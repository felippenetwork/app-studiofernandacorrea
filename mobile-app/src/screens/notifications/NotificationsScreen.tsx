import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList, AppNotification, NotificationType } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { Header, Divider } from '../../components/common';
import { MOCK_NOTIFICATIONS } from '../../mocks/data';
import { formatDateRelative } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;

const NOTIF_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  agendamento_confirmado: 'checkmark-circle-outline',
  lembrete_horario: 'alarm-outline',
  novo_cupom: 'pricetag-outline',
  promocao: 'gift-outline',
  aviso: 'information-circle-outline',
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  agendamento_confirmado: colors.success,
  lembrete_horario: colors.primary,
  novo_cupom: colors.accent,
  promocao: colors.primaryDark,
  aviso: colors.info,
};

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotif = ({ item, index }: { item: AppNotification; index: number }) => {
    const icon = NOTIF_ICONS[item.type];
    const iconColor = NOTIF_COLORS[item.type];

    return (
      <>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.item, !item.isRead && styles.itemUnread]}
        >
          <View style={[styles.iconBox, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
          <View style={styles.itemContent}>
            <View style={styles.itemTop}>
              <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.itemDate}>{formatDateRelative(item.createdAt.split('T')[0])}</Text>
          </View>
        </TouchableOpacity>
        {index < notifications.length - 1 && <Divider indent={60 + spacing[4]} />}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Notificações"
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markReadBtn}>Limpar</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotif}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Sem notificações</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  markReadBtn: {
    ...textStyles.bodySmall,
    color: colors.primary,
  },
  list: {
    backgroundColor: colors.backgroundCard,
    marginHorizontal: spacing[5],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    gap: spacing[3],
  },
  itemUnread: {
    backgroundColor: colors.primaryGhost,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 4,
  },
  itemTitle: {
    ...textStyles.labelMedium,
    color: colors.textSecondary,
    flex: 1,
  },
  itemTitleUnread: {
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  itemBody: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemDate: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  empty: {
    alignItems: 'center',
    padding: spacing[12],
    gap: spacing[3],
  },
  emptyTitle: {
    ...textStyles.h2,
    color: colors.textTertiary,
  },
});
