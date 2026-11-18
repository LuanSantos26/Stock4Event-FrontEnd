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
import { Ionicons } from '@expo/vector-icons';
import {
  SolicitacaoCompra,
  StatusPedidoFornecedor,
  aguardandoConclusaoCliente,
  atualizarStatusSolicitacao,
  descreverQuantidadeItem,
  labelAcaoFornecedor,
  labelStatusPedido,
  listarSolicitacoesRecebidas,
  proximaEtapaFornecedor,
} from '../../services/marketplaceService';
import { formatarPreco } from '../../services/productService';
import { iconeEtapa } from '../PedidoAcompanhamento/components/PedidoParts';

/** Pedidos que ainda não terminaram (nem entregues/retirados, nem cancelados). */
const STATUS_ANDAMENTO = [
  'aguardando_liberacao',
  'em_separacao',
  'abastecendo',
  'em_rota',
  'pronto_retirada',
];

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
    case 'em_separacao':
    case 'abastecendo':
    case 'em_rota':
    case 'pronto_retirada':
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
    const retirada = pedido.tipoEntrega === 'retirada';
    if (aguardandoConclusaoCliente(pedido)) {
      // O último passo é do cliente: o fornecedor só acompanha (ou cancela).
      return (
        <View style={styles.actionRow}>
          <View style={styles.aguardandoCliente}>
            <Ionicons name="hourglass-outline" size={15} color="#8A5A00" />
            <Text style={styles.aguardandoClienteText}>
              {retirada
                ? 'Aguardando o cliente retirar e concluir'
                : 'Aguardando o cliente confirmar o recebimento'}
            </Text>
          </View>
          <TouchableOpacity style={styles.actionSecondary} onPress={() => confirmarCancelamento(pedido)}>
            <Text style={styles.actionSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const proximo = proximaEtapaFornecedor(pedido);
    if (!proximo) return null;
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionPrimary} onPress={() => mudarStatus(pedido, proximo)}>
          <Text style={styles.actionPrimaryText}>{labelAcaoFornecedor(proximo, retirada)}</Text>
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
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Relatorios')}>
                <Text style={styles.headerButtonText}>Relatórios</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('EmpresaGraficos')}>
                <Text style={styles.headerButtonText}>Gráficos</Text>
              </TouchableOpacity>
            </View>
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
                      <View style={styles.entregaTag}>
                        <Ionicons
                          name={pedido.tipoEntrega === 'retirada' ? 'storefront-outline' : 'bicycle-outline'}
                          size={12}
                          color="#4A5568"
                        />
                        <Text style={styles.entregaTagText}>
                          {pedido.tipoEntrega === 'retirada' ? 'Retirada no local' : 'Entrega'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.saleRight}>
                      <Text style={styles.saleValue}>{formatarPreco(pedido.valorTotal)}</Text>
                      <View style={[styles.statusPill, status.pill]}>
                        <Text style={[styles.statusText, status.text]}>
                          {pedido.statusLabel ?? labelStatusPedido(pedido.status, pedido.tipoEntrega)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {pedido.itens.length > 0 ? (
                    <View style={styles.itensBox}>
                      {pedido.itens.map((item) => (
                        <Text key={`${item.produtoId}-${item.tipoVenda ?? 'unidade'}`} style={styles.itemLinha}>
                          {descreverQuantidadeItem(item)} · {item.nome}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {pedido.status !== 'cancelada' && pedido.etapas?.length ? (
                    <View style={styles.etapasRow} accessibilityLabel={`Etapa atual: ${pedido.statusLabel ?? ''}`}>
                      {pedido.etapas.map((etapa, index) => {
                        const ativa = etapa.ativa && !etapa.concluida;
                        return (
                          <React.Fragment key={etapa.codigo}>
                            {index > 0 ? (
                              <View style={[styles.etapaLinha, etapa.concluida || ativa ? styles.etapaLinhaFeita : null]} />
                            ) : null}
                            <View
                              style={[
                                styles.etapaBolinha,
                                etapa.concluida && styles.etapaBolinhaFeita,
                                ativa && styles.etapaBolinhaAtiva,
                              ]}
                            >
                              <Ionicons
                                name={etapa.concluida ? 'checkmark' : iconeEtapa(etapa.codigo)}
                                size={12}
                                color={etapa.concluida || ativa ? '#FFF' : '#9AA3B2'}
                              />
                            </View>
                          </React.Fragment>
                        );
                      })}
                    </View>
                  ) : null}
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
