import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../components/Header/BackButton';
import { BottomTabBar, useBottomTabBarHeight } from '../../components/layout/BottomTabBar';
import { RemoteImage } from '../../components/media/RemoteImage';
import { formatarPreco } from '../../services/productService';
import { formatarDataCurta } from '../../utils/dateFormat';
import { useHeaderTopPadding } from '../../utils/safeArea';
import type { EtapaPedido, SolicitacaoCompra } from '../../services/marketplaceService';
import { chipStatus, codigoPedido, unidadesPedido } from '../Pedidos/usePedidos';
import { styles as empresaStyles } from './styles';
import { clientePedidoStyles as styles } from './styles';
import { CLIENTE_COLORS } from '../../theme/theme';
import { CancelarPedidoButton } from './components/CancelarPedidoButton';
import { BrandLogo } from '../../components/brand/BrandLogo';

const PRIMARY = CLIENTE_COLORS.primary;

const STEP_LABELS: Record<string, string> = {
  recebido: 'Pedido recebido',
  preparando: 'Preparando pedido',
  em_rota: 'Saiu para a entrega',
  entregue: 'Entregue',
};

function stepIcon(codigo: string): keyof typeof Ionicons.glyphMap {
  switch (codigo) {
    case 'recebido':
      return 'checkmark';
    case 'preparando':
      return 'cube-outline';
    case 'em_rota':
      return 'car-outline';
    case 'entregue':
      return 'flag-outline';
    default:
      return 'ellipse-outline';
  }
}

interface Props {
  goBack: () => void;
  pedido: SolicitacaoCompra;
  etapas: EtapaPedido[];
  error: string;
  podeCancelar: boolean;
  cancelando: boolean;
  onCancelar: () => void;
}

export function ClientePedidoDetail({
  goBack,
  pedido,
  etapas,
  error,
  podeCancelar,
  cancelando,
  onCancelar,
}: Props) {
  const topPadding = useHeaderTopPadding(8);
  const tabBarHeight = useBottomTabBarHeight();
  const chip = chipStatus(pedido.status);
  const unidades = unidadesPedido(pedido);

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      >
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerTop}>
            <BackButton onPress={goBack} iconColor={PRIMARY} />
            <BrandLogo variant="azul" height={34} />
            <View style={{ width: 32 }} />
          </View>
          <Text style={styles.title}>Detalhes do pedido</Text>
          <Text style={styles.subtitle}>Acompanhe o status e os itens da sua compra.</Text>
        </View>

        <View style={styles.sheet}>
          {error ? <Text style={empresaStyles.errorText}>{error}</Text> : null}

          <View style={styles.card}>
            <View style={styles.idRow}>
              <View>
                <Text style={styles.code}>{codigoPedido(pedido.id)}</Text>
                <Text style={styles.date}>{formatarDataCurta(pedido.criadoEm)}</Text>
              </View>
              <View
                style={[
                  styles.chip,
                  chip.tone === 'blue' && { backgroundColor: '#E8F1FB' },
                  chip.tone === 'gold' && { backgroundColor: '#FFF6DE' },
                  chip.tone === 'green' && { backgroundColor: '#E8F8EF' },
                  chip.tone === 'gray' && { backgroundColor: '#EEF2F7' },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      chip.tone === 'green' ? '#1B7A4A' : chip.tone === 'gold' ? '#C98912' : PRIMARY,
                  }}
                >
                  {chip.label}
                </Text>
              </View>
            </View>

            <View style={styles.stepper}>
              {etapas.map((etapa, index) => {
                const label = STEP_LABELS[etapa.codigo] ?? etapa.label;
                const done = etapa.concluida;
                const active = etapa.ativa && !etapa.concluida;
                return (
                  <View key={etapa.codigo} style={styles.stepCol}>
                    {index < etapas.length - 1 ? (
                      <View style={[styles.stepLine, done && styles.stepLineDone]} />
                    ) : null}
                    <View
                      style={[
                        styles.stepCircle,
                        done && styles.stepCircleDone,
                        active && styles.stepCircleActive,
                      ]}
                    >
                      <Ionicons
                        name={done ? 'checkmark' : stepIcon(etapa.codigo)}
                        size={14}
                        color={done || active ? '#FFF' : '#9AA3B2'}
                      />
                    </View>
                    <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.storeRow}>
              <View style={styles.storeIcon}>
                <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{pedido.fornecedorNome}</Text>
                <Text style={styles.storeHint}>Bebidas e pedidos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C5CAD3" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Itens do pedido</Text>
            {pedido.itens.map((item) => (
              <View key={item.produtoId} style={styles.itemRow}>
                <RemoteImage uri={item.imagemUrl} style={styles.itemImage} fallbackLabel={item.nome} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.nome}
                  </Text>
                  <Text style={styles.itemUnit}>{item.unidade}</Text>
                </View>
                <View>
                  <Text style={styles.itemQty}>
                    {item.quantidade} {item.quantidade === 1 ? 'unidade' : 'unidades'}
                  </Text>
                  <Text style={styles.itemSub}>{formatarPreco(item.subtotal)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Endereço de entrega</Text>
                <Text style={styles.infoText}>
                  {pedido.enderecoResumo || 'Endereço informado no checkout'}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="car-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Entrega</Text>
                <Text style={styles.infoText}>Entrega padrão</Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total do pedido</Text>
                <Text style={styles.totalHint}>
                  {unidades} {unidades === 1 ? 'unidade' : 'unidades'}
                </Text>
              </View>
              <Text style={styles.totalValue}>{formatarPreco(pedido.valorTotal)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.helpRow}
            onPress={() =>
              Alert.alert(
                'Ajuda',
                'Dúvidas sobre o pedido: fale com a equipe Stock4event pelo e-mail da sua conta.',
              )
            }
          >
            <Ionicons name="help-circle-outline" size={18} color={PRIMARY} />
            <Text style={styles.helpText}>Precisa de ajuda?</Text>
          </TouchableOpacity>

          {podeCancelar ? <CancelarPedidoButton onPress={onCancelar} loading={cancelando} /> : null}
        </View>
      </ScrollView>
      <BottomTabBar activeRoute="PedidoAcompanhamento" />
    </View>
  );
}
