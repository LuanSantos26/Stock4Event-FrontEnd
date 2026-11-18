import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { descreverQuantidadeItem, labelMetodoPagamento } from '../../services/marketplaceService';
import { formatarPreco } from '../../services/productService';
import { formatarDataCurta } from '../../utils/dateFormat';
import { styles } from './styles';
import { ClientePedidoDetail } from './ClientePedidoDetail';
import { ACCENT, InfoRow, ProgressBar, TimelineStep } from './components/PedidoParts';
import { CancelarPedidoButton } from './components/CancelarPedidoButton';
import { ConcluirEntregaButton } from './components/ConcluirEntregaButton';
import { usePedidoAcompanhamento } from './usePedidoAcompanhamento';
import { COMPANY_COLORS } from '../../theme/theme';

export function PedidoAcompanhamentoScreen() {
  const {
    navigation,
    goBack,
    pedidosIds,
    pedidoAtivoId,
    setPedidoAtivoId,
    pedido,
    loading,
    error,
    carregarPedido,
    etapas,
    previsaoLabel,
    progresso,
    entregue,
    headerTitle,
    tituloHero,
    subtituloHero,
    heroIcon,
    perfilUso,
    podeCancelar,
    cancelando,
    confirmarCancelamento,
    podeConcluir,
    concluindo,
    confirmarConclusao,
  } = usePedidoAcompanhamento();

  if (loading && !pedido) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Carregando acompanhamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !pedido) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => carregarPedido()}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!pedido) return null;

  if (perfilUso === 'Cliente') {
    return (
      <ClientePedidoDetail
        goBack={goBack}
        pedido={pedido}
        etapas={etapas}
        error={error}
        podeCancelar={podeCancelar}
        cancelando={cancelando}
        onCancelar={confirmarCancelamento}
        podeConcluir={podeConcluir}
        concluindo={concluindo}
        onConcluir={confirmarConclusao}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BackTitleHeader title={headerTitle} onBack={goBack} />

        {pedidosIds.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pedidosTabs}
          >
            {pedidosIds.map((id, index) => {
              const ativo = id === pedidoAtivoId;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.pedidoTab, ativo && styles.pedidoTabActive]}
                  onPress={() => setPedidoAtivoId(id)}
                >
                  <Text style={[styles.pedidoTabText, ativo && styles.pedidoTabTextActive]}>
                    Pedido {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={[styles.heroCard, entregue && styles.heroCardSuccess]}>
          {entregue ? (
            <LinearGradient
              colors={['#E8F5E9', '#FFFFFF']}
              style={styles.heroAccentStrip}
            />
          ) : (
            <LinearGradient
              colors={[COMPANY_COLORS.primarySoft, '#FFFFFF']}
              style={styles.heroAccentStrip}
            />
          )}

          <View style={[styles.heroIconWrap, { backgroundColor: heroIcon.bg }]}>
            <MaterialCommunityIcons
              name={heroIcon.name}
              size={40}
              color={heroIcon.color}
            />
          </View>

          <Text style={styles.heroTitle}>{tituloHero}</Text>
          <Text style={styles.heroSubtitle}>{subtituloHero}</Text>

          {!entregue && previsaoLabel ? (
            <View style={styles.etaBox}>
              <Ionicons name="timer-outline" size={17} color="#C77800" />
              <Text style={styles.etaText}>{previsaoLabel}</Text>
            </View>
          ) : null}

          <ProgressBar progress={progresso} concluido={entregue} />

          <View style={styles.heroChipsRow}>
            <View style={styles.heroChip}>
              <Ionicons name="receipt-outline" size={13} color="#666" />
              <Text style={styles.heroChipText}>#{pedido.id}</Text>
            </View>
            <View style={[styles.heroChip, styles.heroChipWide]}>
              <Ionicons name="storefront-outline" size={13} color="#666" />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {pedido.fornecedorNome}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-commit-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Andamento</Text>
          </View>
          <View style={styles.timelineWrap}>
            {etapas.map((etapa, index) => (
              <TimelineStep key={etapa.codigo} etapa={etapa} isLast={index === etapas.length - 1} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>
              {pedido.tipoEntrega === 'retirada' ? 'Retirada no local' : 'Detalhes da entrega'}
            </Text>
          </View>
          {pedido.enderecoResumo ? (
            <InfoRow
              icon={pedido.tipoEntrega === 'retirada' ? 'storefront-outline' : 'navigate-outline'}
              label={pedido.tipoEntrega === 'retirada' ? 'Retirar em' : 'Endereço'}
              value={pedido.enderecoResumo.replace(/^Retirada no local: /, '')}
            />
          ) : null}
          <InfoRow
            icon="card-outline"
            label="Pagamento"
            value={labelMetodoPagamento(pedido.metodoPagamento)}
          />
          <InfoRow
            icon="calendar-outline"
            label="Realizado em"
            value={formatarDataCurta(pedido.criadoEm)}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Itens ({pedido.itens.length})</Text>
          </View>
          {pedido.itens.map((item, index) => (
            <View
              key={`${item.produtoId}-${item.tipoVenda ?? 'unidade'}`}
              style={[
                styles.itemRow,
                index === pedido.itens.length - 1 && styles.itemRowLast,
              ]}
            >
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>
                  {item.tipoVenda === 'palete' && item.quantidadePaletes ? item.quantidadePaletes : item.quantidade}
                </Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemNome} numberOfLines={2}>{item.nome}</Text>
                <Text style={styles.itemDetalhe}>
                  {item.tipoVenda === 'palete' && item.precoPalete
                    ? `${descreverQuantidadeItem(item)} · ${formatarPreco(item.precoPalete)} o palete`
                    : `${item.unidade} · ${formatarPreco(item.precoUnitario)} un.`}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatarPreco(item.subtotal)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            {pedido.taxaEntrega != null && pedido.taxaEntrega > 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Taxa de entrega</Text>
                <Text style={styles.totalValue}>{formatarPreco(pedido.taxaEntrega)}</Text>
              </View>
            ) : null}
            <View style={styles.totalLine}>
              <Text style={styles.totalLabelBold}>Total pago</Text>
              <Text style={styles.totalValueBold}>{formatarPreco(pedido.valorTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {entregue ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Ionicons name="home-outline" size={18} color={ACCENT} />
              <Text style={styles.secondaryButtonText}>Ir para início</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, !entregue && styles.primaryButtonFull]}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.primaryButtonText}>Continuar comprando</Text>
          </TouchableOpacity>
        </View>
        {podeConcluir ? (
          <ConcluirEntregaButton
            retirada={pedido.tipoEntrega === 'retirada'}
            onPress={confirmarConclusao}
            loading={concluindo}
          />
        ) : null}
        {podeCancelar ? (
          <CancelarPedidoButton onPress={confirmarCancelamento} loading={cancelando} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
