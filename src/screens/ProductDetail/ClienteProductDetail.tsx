import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RemoteImage } from '../../components/media/RemoteImage';
import { getImageUrl } from '../../config/api';
import { formatarPreco } from '../../services/productService';
import { useHeaderTopPadding, useBottomInset } from '../../utils/safeArea';
import { GREEN, PRIMARY, clienteProductStyles as styles } from './clienteProductStyles';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { TipoVendaSelector } from '../../components/produto/TipoVendaSelector';
import type { TipoVenda } from '../../types/marketplace';

interface Props {
  productName: string;
  descricao?: string;
  imagemUrl?: string;
  unidade: string;
  precoVenda: number;
  productCodigo?: string;
  fornecedorNome: string;
  fornecedorLogoUrl?: string;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  estoqueRestante: number;
  esgotado: boolean;
  adding: boolean;
  feedback: string;
  loading: boolean;
  onBack: () => void;
  onOpenStore: () => void;
  onAddToCart: () => void;
  /** Venda em palete fechado (quando o fornecedor oferece). */
  temPalete?: boolean;
  tipoVenda?: TipoVenda;
  onChangeTipoVenda?: (tipo: TipoVenda) => void;
  precoPalete?: number | null;
  unidadesPorPalete?: number | null;
  /** Preço de uma unidade ou de um palete, conforme a escolha. */
  precoSelecionado?: number;
  /** Quantas unidades ou paletes ainda cabem no estoque. */
  maximoSelecionavel?: number;
}

export function ClienteProductDetail({
  productName,
  descricao,
  imagemUrl,
  unidade,
  precoVenda,
  productCodigo,
  fornecedorNome,
  fornecedorLogoUrl,
  quantity,
  setQuantity,
  estoqueRestante,
  esgotado,
  adding,
  feedback,
  loading,
  onBack,
  onOpenStore,
  onAddToCart,
  temPalete = false,
  tipoVenda = 'unidade',
  onChangeTipoVenda,
  precoPalete,
  unidadesPorPalete,
  precoSelecionado,
  maximoSelecionavel,
}: Props) {
  const topPadding = useHeaderTopPadding(8);
  const bottomInset = useBottomInset();
  const porPalete = temPalete && tipoVenda === 'palete';
  const total = (precoSelecionado ?? precoVenda) * quantity;
  const maximo = maximoSelecionavel ?? estoqueRestante;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity style={styles.headerSide} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <BrandLogo variant="azul" height={34} />
          <Text style={styles.headerSubtitle}>Detalhes do produto</Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.sheet, { paddingBottom: 16 }]}
      >
        <View style={styles.imageCard}>
          {imagemUrl ? (
            <RemoteImage
              uri={getImageUrl(imagemUrl)}
              style={styles.image}
              fallbackLabel={productName}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="wine-outline" size={64} color="#C5CAD3" />
          )}
        </View>

        <Text style={styles.name}>{productName.replace('\n', ' ')}</Text>
        <Text style={styles.volume}>{unidade}</Text>

        <View style={styles.idRow}>
          <Text style={styles.idText}>{productCodigo ? `ID ${productCodigo}` : '—'}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text>
            <Text style={styles.price}>{formatarPreco(precoVenda)}</Text>
            <Text style={styles.unit}> /un</Text>
          </Text>
          <View style={[styles.stockBadge, esgotado && { backgroundColor: '#FDECEC' }]}>
            <Ionicons name="cube-outline" size={16} color={esgotado ? '#C62828' : GREEN} />
            <View>
              <Text style={[styles.stockTitle, esgotado && { color: '#C62828' }]}>
                {esgotado ? 'Esgotado' : 'Em estoque'}
              </Text>
              <Text style={[styles.stockHint, esgotado && { color: '#C62828' }]}>
                {loading ? 'Atualizando...' : `${estoqueRestante} unidades`}
              </Text>
            </View>
          </View>
        </View>

        {temPalete && precoPalete && unidadesPorPalete && onChangeTipoVenda ? (
          <TipoVendaSelector
            tipoVenda={tipoVenda}
            onChange={onChangeTipoVenda}
            precoVenda={precoVenda}
            precoPalete={precoPalete}
            unidadesPorPalete={unidadesPorPalete}
            unidade={unidade}
          />
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="cube-outline" size={20} color={PRIMARY} />
            <Text style={styles.statLabel}>Unidade{'\n'}{unidade}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="clipboard-outline" size={20} color={PRIMARY} />
            <Text style={styles.statLabel}>
              Pedido mínimo{'\n'}{porPalete ? '1 palete' : '1 unidade'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="bicycle-outline" size={20} color={PRIMARY} />
            <Text style={styles.statLabel}>Retirada e{'\n'}Entrega</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.vendorCard} onPress={onOpenStore} activeOpacity={0.85}>
          <RemoteImage
            uri={getImageUrl(fornecedorLogoUrl)}
            style={styles.vendorLogo}
            fallbackLabel={fornecedorNome}
            resizeMode="cover"
          />
          <View style={styles.vendorCopy}>
            <Text style={styles.vendorLabel}>Vendido por</Text>
            <Text style={styles.vendorName} numberOfLines={1}>
              {fornecedorNome}
            </Text>
            <View style={styles.vendorMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={12} color="#8A93A3" />
                <Text style={styles.vendorCity}>Distribuidora</Text>
              </View>
              <Text style={styles.verQuiosque}>Ver quiosque</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C5CAD3" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Descrição</Text>
        <Text style={styles.description}>
          {descricao || 'Produto disponível para reserva neste quiosque.'}
        </Text>

        {feedback ? (
          <Text
            style={[
              styles.feedback,
              { color: feedback.includes('adicionado') ? GREEN : '#C62828' },
            ]}
          >
            {feedback}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 10) }]}>
        <View style={styles.qtyBox}>
          <TouchableOpacity
            style={styles.qtyBtn}
            disabled={esgotado}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Ionicons name="remove" size={18} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>
            {quantity}
            {porPalete ? ' pal.' : ''}
          </Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            disabled={esgotado || quantity >= maximo}
            onPress={() => setQuantity((q) => Math.min(maximo, q + 1))}
          >
            <Ionicons name="add" size={18} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} numberOfLines={1}>
            {formatarPreco(total)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, (esgotado || adding) && { opacity: 0.5 }]}
          onPress={onAddToCart}
          disabled={esgotado || adding}
          activeOpacity={0.85}
        >
          {adding ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={14} color="#FFF" />
              <Text style={styles.addButtonText} numberOfLines={1}>
                {esgotado ? 'Esgotado' : 'Adicionar ao carrinho'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
