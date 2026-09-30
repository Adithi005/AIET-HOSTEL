import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Trash2,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { StudentNotification } from '../types';

interface NotificationsModalProps {
  visible: boolean;
  notifications: StudentNotification[];
  onClose: () => void;
  onClearAll: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  notifications,
  onClose,
  onClearAll,
  onMarkAllRead,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderIcon = (type: StudentNotification['type'], severity: StudentNotification['severity']) => {
    switch (type) {
      case 'outing_blocked':
        return <ShieldAlert size={20} color="#EF4444" />;
      case 'curfew_warning':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'swo_cleared':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'holiday_pass':
        return <Sparkles size={20} color="#6366F1" />;
      default:
        return severity === 'critical' ? (
          <ShieldAlert size={20} color="#EF4444" />
        ) : severity === 'warning' ? (
          <AlertTriangle size={20} color="#F59E0B" />
        ) : (
          <Bell size={20} color={colors.primary} />
        );
    }
  };

  const getBorderColor = (type: StudentNotification['type'], severity: StudentNotification['severity']) => {
    if (type === 'outing_blocked' || severity === 'critical') return '#EF4444';
    if (type === 'curfew_warning' || severity === 'warning') return '#F59E0B';
    if (type === 'swo_cleared' || severity === 'success') return '#10B981';
    if (type === 'holiday_pass') return '#6366F1';
    return colors.border;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Bell size={20} color="#FFFFFF" />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSubtitle}>Curfew Alerts, SWO Desk & Pass Updates</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Bar */}
          {notifications.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity onPress={onMarkAllRead} style={styles.actionBtn}>
                <CheckCircle2 size={14} color={colors.primary} />
                <Text style={styles.actionBtnText}>Mark All Read</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClearAll} style={styles.actionBtn}>
                <Trash2 size={14} color={colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List */}
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Bell size={36} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptyDesc}>
                  You are all caught up! Curfew alerts, gate entry updates, and SWO permissions will appear here.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const borderColor = getBorderColor(item.type, item.severity);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      { borderLeftColor: borderColor },
                      !item.read && styles.unreadCard,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconBox}>{renderIcon(item.type, item.severity)}</View>
                      <View style={styles.cardHeaderText}>
                        <Text style={[styles.cardTitle, !item.read && styles.boldTitle]}>
                          {item.title}
                        </Text>
                        <View style={styles.timestampRow}>
                          <Clock size={11} color={colors.textMuted} />
                          <Text style={styles.timestampText}>{item.timestamp}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: 28,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  cardIconBox: {
    marginTop: 1,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  boldTitle: {
    fontWeight: '800',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  timestampText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
