import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/Header/ScreenHeader';
import { styles } from './styles';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { useAuth } from '../../context/AuthContext';
import {
  SolicitacaoCompra,
  StatusPedidoFornecedor,
  atualizarStatusSolicitacao,
  labelStatusPedido,
  listarSolicitacoesRecebidas,
} from '../../services/marketplaceService';
import { formatarPreco } from '../../services/productService';

const STATUS_ANDAMENTO = ['recebido', 'preparando', 'em_rota'];

/**
 * Próxima etapa que o fornecedor aciona à mão, e o texto do botão.
 * 'entregue' e 'cancelada' encerram o pedido, então não têm sucessor.
 */
const PROXIMA_ETAPA: Record<string, { status: StatusPedidoFornecedor; label: string }> = {
  recebido: { status: 'preparando', label: 'Preparar pedido' },
  preparando: { status: 'em_rota', label: 'Despachar' },
  em_rota: { status: 'entregue', label: 'Confirmar entrega' },
};

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function mesmoMes(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatarHora(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function estiloStatus(status: string) {
  switch (status) {
    case 'preparando':
    case 'em_rota':
      return { pill: styles.statusPillRota, text: styles.statusTextRota };
    case 'entregue':
      return { pill: styles.statusPillEntregue, text: styles.statusTextEntregue };
    case 'cancelada':
      return { pill: styles.statusPillCancelada, text: styles.statusTextCancelada };
    default:
      return { pill: null, text: null };
  }
}

export function EmpresaVendasScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [pedidos, setPedidos] = useState<SolicitacaoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [atualizandoId, setAtualizandoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setError('');
    try {
      setPedidos(await listarSolicitacoesRecebidas(empresaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const metricas = useMemo(() => {
    const agora = new Date();
    const validos = pedidos.filter((p) => p.status !== 'cancelada');
    const somar = (lista: SolicitacaoCompra[]) => lista.reduce((total, p) => total + p.valorTotal, 0);
    const doDia = validos.filter((p) => mesmoDia(new Date(p.criadoEm), agora));
    const doMes = validos.filter((p) => mesmoMes(new Date(p.criadoEm), agora));
    const emAndamento = validos.filter((p) => STATUS_ANDAMENTO.includes(p.status)).length;
    return {
      hoje: { valor: formatarPreco(somar(doDia)), delta: `${doDia.length} pedido(s) hoje` },
      mes: { valor: formatarPreco(somar(doMes)), delta: `${doMes.length} pedido(s) no mês` },
      pedidos: { valor: String(validos.length), delta: `${emAndamento} em andamento` },
    };
  }, [pedidos]);

  const mudarStatus = async (pedido: SolicitacaoCompra, status: StatusPedidoFornecedor) => {
    if (!empresaId) return;
    setAtualizandoId(pedido.id);
    try {
      const atualizado = await atualizarStatusSolicitacao(pedido.id, empresaId, status);
      setPedidos((lista) => lista.map((p) => (p.id === atualizado.id ? atualizado : p)));
    } catch (err) {
      Alert.alert('Pedido', err instanceof Error ? err.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const confirmarCancelamento = (pedido: SolicitacaoCompra) => {
    Alert.alert(
      'Cancelar pedido',
      `Cancelar o pedido #${pedido.id}? O estoque volta para o seu catálogo.`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar pedido', style: 'destructive', onPress: () => mudarStatus(pedido, 'cancelada') },
      ],
    );
  };

  const renderAcoes = (pedido: SolicitacaoCompra) => {
    if (!STATUS_ANDAMENTO.includes(pedido.status)) return null;
    if (atualizandoId === pedido.id) {
      return <ActivityIndicator style={styles.actionLoader} />;
    }
    const proximo = PROXIMA_ETAPA[pedido.status];
    if (!proximo) return null;
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionPrimary} onPress={() => mudarStatus(pedido, proximo.status)}>
          <Text style={styles.actionPrimaryText}>{proximo.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionSecondary} onPress={() => confirmarCancelamento(pedido)}>
          <Text style={styles.actionSecondaryText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              carregar();
            }}
          />
        }
      >
        <ScreenHeader
          title="Vendas"
          subtitle="Acompanhe o faturamento e os pedidos da empresa."
          inset={16}
          style={{ marginBottom: 16 }}
          rightSlot={
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('EmpresaGraficos')}>
              <Text style={styles.headerButtonText}>Gráficos</Text>
            </TouchableOpacity>
          }
        />
        {/* Métricas */}
        <View style={styles.summaryGrid}>
          <View style={[styles.metricCard, styles.positiveCard]}>
            <Text style={styles.metricLabel}>Hoje</Text>
            <Text style={styles.metricValue}>{metricas.hoje.valor}</Text>
            <Text style={styles.metricDelta}>{metricas.hoje.delta}</Text>
          </View>
          <View style={[styles.metricCard, styles.primaryCard]}>
            <Text style={styles.metricLabel}>Mês</Text>
            <Text style={styles.metricValue}>{metricas.mes.valor}</Text>
            <Text style={styles.metricDelta}>{metricas.mes.delta}</Text>
          </View>
          <View style={[styles.metricCard, styles.warningCard]}>
            <Text style={styles.metricLabel}>Pedidos</Text>
            <Text style={styles.metricValue}>{metricas.pedidos.valor}</Text>
            <Text style={styles.metricDelta}>{metricas.pedidos.delta}</Text>
          </View>
        </View>

        {/* Pedidos recebidos */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pedidos recebidos</Text>
          {loading ? (
            <ActivityIndicator style={styles.actionLoader} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : pedidos.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum pedido recebido ainda.</Text>
          ) : (
            pedidos.map((pedido) => {
              const status = estiloStatus(pedido.status);
              return (
                <View key={pedido.id} style={styles.saleRow}>
                  <View style={styles.saleTop}>
                    <View style={styles.saleLeft}>
                      <Text style={styles.saleClient}>{pedido.compradorNome ?? 'Cliente'}</Text>
                      <Text style={styles.saleMeta}>
                        Pedido #{pedido.id} • {formatarHora(pedido.criadoEm)} • {pedido.itens.length} item(ns)
                      </Text>
                    </View>
                    <View style={styles.saleRight}>
                      <Text style={styles.saleValue}>{formatarPreco(pedido.valorTotal)}</Text>
                      <View style={[styles.statusPill, status.pill]}>
                        <Text style={[styles.statusText, status.text]}>
                          {pedido.statusLabel ?? labelStatusPedido(pedido.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {renderAcoes(pedido)}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    <BottomTabBar activeRoute="EmpresaVendas" />
    </View>
  );
}
