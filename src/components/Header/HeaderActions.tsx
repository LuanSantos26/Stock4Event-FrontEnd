import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listarNotificacoes, perfilDasNotificacoes } from '../../services/notificacaoService';
import { contarNaoLidas } from '../../utils/notificacoesStorage';
import { formatarDiaSemana } from '../../utils/dateFormat';
import { CalendarModal } from './CalendarModal';
import { NotificationsModal } from '../Card/NotificationsModal';
import { COMPANY_COLORS } from '../../theme/theme';

interface HeaderActionsProps {
  showCalendar?: boolean;
  showCartBadge?: boolean;
  cartItemCount?: number;
  onCartPress?: () => void;
  datePillStyle?: object;
  iconButtonStyle?: object;
}

export function HeaderActions({
  showCalendar = false,
  showCartBadge = false,
  cartItemCount = 0,
  onCartPress,
  datePillStyle,
  iconButtonStyle,
}: HeaderActionsProps) {
  const { user, perfilUso } = useAuth();
  const empresaId = user?.empresa?.id;
  const perfil = perfilDasNotificacoes(perfilUso);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const carregarNaoLidas = useCallback(async () => {
    if (!empresaId) return;
    try {
      const lista = await listarNotificacoes(empresaId, perfil);
      const count = await contarNaoLidas(empresaId, lista.map((n) => n.id));
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [empresaId, perfil]);

  useFocusEffect(
    useCallback(() => {
      carregarNaoLidas();
    }, [carregarNaoLidas]),
  );

  useEffect(() => {
    if (!notificationsOpen) carregarNaoLidas();
  }, [notificationsOpen, carregarNaoLidas]);

  return (
    <>
      <View style={styles.row}>
        {showCalendar ? (
          <TouchableOpacity
            style={[styles.datePill, datePillStyle]}
            onPress={() => setCalendarOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dateText}>{formatarDiaSemana()}</Text>
            <Ionicons name="calendar-outline" size={16} color={COMPANY_COLORS.primary} style={styles.calendarIcon} />
          </TouchableOpacity>
        ) : null}

        {showCartBadge && cartItemCount > 0 ? (
          <TouchableOpacity style={styles.cartBadge} onPress={onCartPress}>
            <Ionicons name="cart" size={18} color="#FFF" />
            <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.iconButton, iconButtonStyle, showCartBadge && cartItemCount > 0 && styles.iconButtonCompact]}
          onPress={() => setNotificationsOpen(true)}
          activeOpacity={0.8}
        >
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
      </View>

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        empresaId={empresaId}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  dateText: {
    color: COMPANY_COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  calendarIcon: { marginLeft: 4 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D64545',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COMPANY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  cartBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  iconButtonCompact: { marginLeft: 0 },
});
