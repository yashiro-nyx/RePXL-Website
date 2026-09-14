import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import type { Notification } from '../types';

type NotificationCategory = 'ALL' | 'ORDERS' | 'RETURNS' | 'PROMOS' | 'UPDATES';

const CATEGORY_TABS: Array<{ id: NotificationCategory; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'ORDERS', label: 'Orders' },
  { id: 'RETURNS', label: 'Returns & Refunds' },
  { id: 'PROMOS', label: 'Promotions' },
  { id: 'UPDATES', label: 'News' },
];

function getCategoryForEvent(event: string): NotificationCategory {
  const upper = event.toUpperCase();
  if (upper.includes('RETURN') || upper.includes('REFUND')) return 'RETURNS';
  if (upper.includes('ORDER')) return 'ORDERS';
  if (upper.includes('PROMO') || upper.includes('VOUCHER') || upper.includes('DISCOUNT')) return 'PROMOS';
  if (upper.includes('UPDATE') || upper.includes('REPIXL')) return 'UPDATES';
  return 'ALL';
}

function getEventBadgeDetails(event: string): {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
} {
  const upper = event.toUpperCase();
  if (upper === 'ORDER_CONFIRMATION') {
    return {
      label: 'Order Confirmed',
      icon: 'check-circle',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
    };
  }
  if (upper === 'ORDER_STATUS_CHANGE') {
    return {
      label: 'Order Update',
      icon: 'truck',
      color: '#60a5fa',
      bg: 'rgba(96, 165, 250, 0.15)',
    };
  }
  if (upper === 'RETURN_RECEIVED') {
    return {
      label: 'Return Received',
      icon: 'rotate-ccw',
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.15)',
    };
  }
  if (upper === 'RETURN_STATUS_CHANGE') {
    return {
      label: 'Return Status',
      icon: 'alert-circle',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
    };
  }
  if (upper === 'REFUND_COMPLETED') {
    return {
      label: 'Refund Issued',
      icon: 'dollar-sign',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.15)',
    };
  }
  if (upper === 'PROMOTION') {
    return {
      label: 'Special Offer',
      icon: 'tag',
      color: '#a3e635',
      bg: 'rgba(163, 230, 53, 0.15)',
    };
  }
  if (upper === 'REPIXL_UPDATE') {
    return {
      label: 'RePXL Archive',
      icon: 'bell',
      color: '#c084fc',
      bg: 'rgba(192, 132, 252, 0.15)',
    };
  }

  return {
    label: event.replace(/_/g, ' '),
    icon: 'bell',
    color: '#9ca3af',
    bg: 'rgba(156, 163, 175, 0.15)',
  };
}

function extractOrderNumber(text: string): string | null {
  const match = text.match(/\b(RPX-[A-Z0-9]+)\b/i);
  return match ? match[1] : null;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications,
  } = useApp();

  const [activeTab, setActiveTab] = useState<NotificationCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  }, [refreshNotifications]);

  const handleMarkAllRead = async () => {
    if (markingAll || unreadNotificationsCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    return notifications.filter((item) => getCategoryForEvent(item.event) === activeTab);
  }, [notifications, activeTab]);

  const handleCardPress = (notification: Notification) => {
    if (!notification.isRead) {
      void markNotificationRead(notification.id);
    }
    const orderNumber = extractOrderNumber(notification.message);
    if (orderNumber) {
      router.push({ pathname: '/order', params: { orderNumber } });
    }
  };

  const handleOrderPress = (notification: Notification, orderNumber: string) => {
    if (!notification.isRead) {
      void markNotificationRead(notification.id);
    }
    router.push({ pathname: '/order', params: { orderNumber } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Notifications</Text>
          {unreadNotificationsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </View>

        {unreadNotificationsCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingAll}
            style={styles.markAllButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.markAllText}>{markingAll ? 'Updating…' : 'Mark all read'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Category Filter Pills */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const count =
              tab.id === 'ALL'
                ? notifications.length
                : notifications.filter((item) => getCategoryForEvent(item.event) === tab.id).length;

            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCount, isSelected && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, isSelected && styles.tabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification Cards List */}
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#c62828"
            colors={['#c62828']}
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="bell-off" size={32} color="#555" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'ALL'
                ? "You're all caught up! Automated order updates, shipping notifications, and vouchers will appear here."
                : `No notifications found in "${CATEGORY_TABS.find((t) => t.id === activeTab)?.label}".`}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => {
            const badge = getEventBadgeDetails(item.event);
            const orderNumber = extractOrderNumber(item.message);
            const timeFormatted = formatRelativeTime(item.createdAt);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.85}
              >
                {/* Card Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.eventBadge, { backgroundColor: badge.bg }]}>
                      <Feather name={badge.icon} size={11} color={badge.color} />
                      <Text style={[styles.eventBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.timeText}>{timeFormatted}</Text>
                </View>

                {/* Card Message Body */}
                <Text style={styles.messageText}>{item.message}</Text>

                {/* Card Action Row (if Order detected) */}
                {orderNumber && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleOrderPress(item, orderNumber)}
                      style={styles.orderButton}
                      activeOpacity={0.8}
                    >
                      <Feather name="package" size={13} color="#fff" />
                      <Text style={styles.orderButtonText}>Track Order #{orderNumber}</Text>
                      <Feather name="chevron-right" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  badge: {
    backgroundColor: '#c62828',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  markAllText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  headerSpacer: {
    width: 36,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0d0d0d',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
  },
  tabButtonActive: {
    backgroundColor: '#c62828',
    borderColor: '#c62828',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabCount: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#262626',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    color: '#aaa',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  tabCountTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  notificationCardUnread: {
    backgroundColor: '#1a1616',
    borderColor: 'rgba(198, 40, 40, 0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c62828',
  },
  timeText: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  messageText: {
    color: '#e5e5e5',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#c62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});

