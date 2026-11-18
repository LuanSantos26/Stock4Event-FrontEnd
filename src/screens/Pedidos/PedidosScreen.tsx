import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationsModal } from '../../components/Card/NotificationsModal';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { useAuth } from '../../context/AuthContext';
import { useHeaderTopPadding } from '../../utils/safeArea';
import { formatarPreco } from '../../services/productService';
import { formatarDataCurta } from '../../utils/dateFormat';
import { PRIMARY, styles } from './styles';
import {
  AbaPedidos,
  chipStatus,
  codigoPedido,
  unidadesPedido,
  usePedidos,
} from './usePedidos';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useNavigation } from '@react-navigation/native';

const ABAS: { key: AbaPedidos; label: string }[] = [
  { key: 'realizados', label: 'Realizados' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'concluidos', label: 'Concluídos' },
];

function chipStyle(tone: ReturnType<typeof chipStatus>['tone']) {
  switch (tone) {
    case 'blue':
      return { wrap: styles.chipBlue, text: styles.chipTextBlue, icon: 'cube-outline' as const, color: PRIMARY };
    case 'gold':
      return { wrap: styles.chipGold, text: styles.chipTextGold, icon: 'car-outline' as const, color: '#C98912' };
    case 'green':
      return { wrap: styles.chipGreen, text: styles.chipTextGreen, icon: 'checkmark-circle' as const, color: '#1B7A4A' };
    default:
      return { wrap: styles.chipGray, text: styles.chipTextGray, icon: 'document-text-outline' as const, color: '#6B7280' };
  }
}

export function PedidosScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const topPadding = useHeaderTopPadding(8);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const {
    aba,
    setAba,
    lista,
    loading,
    error,
    tabBarHeight,
    carregar,
    abrirDetalhe,
    abrirExplorar,
  } = usePedidos();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16, flexGrow: 1 }}
      >
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerTop}>
            <BrandLogo variant="azul" height={34} />
            <TouchableOpacity
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setNotificationsOpen(true)}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Histórico de pedidos</Text>
          <Text style={styles.subtitle}>Consulte seus pedidos realizados.</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 6,
              marginTop: 10,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
            onPress={() => navigation.navigate('Relatorios')}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Relatórios para baixar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sheet}>
          <View style={styles.tabs}>
            {ABAS.map((item) => {
              const active = aba === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setAba(item.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 24 }} />
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={carregar}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : lista.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={44} color={PRIMARY} />
              <Text style={styles.emptyTitle}>Nenhum pedido aqui</Text>
              <Text style={styles.emptyText}>
                Quando você finalizar uma compra, o pedido aparece neste histórico.
              </Text>
              <TouchableOpacity style={styles.cta} onPress={abrirExplorar} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Ver produtos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listCard}>
              {lista.map((pedido, index) => {
                const chip = chipStatus(pedido.status);
                const visual = chipStyle(chip.tone);
                const unidades = unidadesPedido(pedido);
                return (
                  <TouchableOpacity
                    key={pedido.id}
                    style={[styles.pedidoRow, index === lista.length - 1 && styles.pedidoRowLast]}
                    onPress={() => abrirDetalhe(pedido)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.pedidoTop}>
                      <View>
                        <Text style={styles.pedidoCode}>{codigoPedido(pedido.id)}</Text>
                        <Text style={styles.pedidoDate}>{formatarDataCurta(pedido.criadoEm)}</Text>
                      </View>
                      <View style={[styles.chip, visual.wrap]}>
                        <Ionicons name={visual.icon} size={12} color={visual.color} />
                        <Text style={[styles.chipText, visual.text]}>{chip.label}</Text>
                      </View>
                    </View>
                    <View style={styles.storeRow}>
                      <View style={styles.storeIcon}>
                        <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.storeName} numberOfLines={1}>
                          {pedido.fornecedorNome}
                        </Text>
                        <Text style={styles.storeHint}>Bebidas e pedidos</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#C5CAD3" />
                    </View>
                    <View style={styles.pedidoBottom}>
                      <Text style={styles.pedidoMeta}>
                        {unidades} {unidades === 1 ? 'unidade' : 'unidades'}
                        {'  |  '}
                        <Text style={styles.pedidoTotal}>{formatarPreco(pedido.valorTotal)}</Text>
                      </Text>
                      <Text style={styles.detalhes}>Ver detalhes</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomTabBar activeRoute="Pedidos" />
      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        empresaId={user?.empresa?.id}
      />
    </View>
  );
}
