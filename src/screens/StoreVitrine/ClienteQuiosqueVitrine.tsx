import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { RemoteImage } from '../../components/media/RemoteImage';
import { NotificationsModal } from '../../components/Card/NotificationsModal';
import { BottomTabBar, useBottomTabBarHeight } from '../../components/layout/BottomTabBar';
import { getImageUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { usePurchaseCart } from '../../context/PurchaseCartContext';
import { useHeaderTopPadding } from '../../utils/safeArea';
import { labelTipoFornecedor } from '../../services/marketplaceService';
import { formatarPreco, Produto, normalizarEstoque } from '../../services/productService';
import { PRIMARY, clienteQuiosqueStyles as styles } from './clienteQuiosqueStyles';
import { BrandLogo } from '../../components/brand/BrandLogo';

const CATEGORIAS = [
  { id: 'todas', label: 'Todas', keywords: [] as string[] },
  { id: 'aguas', label: 'Águas', keywords: ['água', 'agua', 'mineral'] },
  { id: 'refrigerantes', label: 'Refrigerantes', keywords: ['refrigerante', 'cola', 'guaraná', 'guarana', 'fanta', 'sprite'] },
  { id: 'sucos', label: 'Sucos', keywords: ['suco', 'néctar', 'nectar', 'laranja'] },
  { id: 'cervejas', label: 'Cervejas', keywords: ['cerveja', 'pilsen', 'lager', 'heineken'] },
  { id: 'vinhos', label: 'Vinhos', keywords: ['vinho', 'tinto', 'branco', 'chardonnay'] },
  { id: 'espumantes', label: 'Espumantes', keywords: ['espumante', 'champagne', 'prosecco'] },
  { id: 'destilados', label: 'Destilados', keywords: ['destilado', 'vodka', 'whisky', 'gin', 'cachaça', 'cachaca'] },
];

function textoProduto(produto: Produto) {
  return `${produto.nome} ${produto.descricao ?? ''}`.toLowerCase();
}

interface Props {
  fornecedorId: number;
  fornecedorNome: string;
  descricao?: string;
  logoUrl?: string;
  capaUrl?: string;
  tipo?: string;
  produtos: Produto[];
  loading: boolean;
  error: string;
  search: string;
  setSearch: (value: string) => void;
  onBack: () => void;
  onOpenProduct: (produto: Produto) => void;
}

export function ClienteQuiosqueVitrine({
  fornecedorId,
  fornecedorNome,
  descricao,
  logoUrl,
  capaUrl,
  tipo,
  produtos,
  loading,
  error,
  search,
  setSearch,
  onBack,
  onOpenProduct,
}: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { itemCount, addItem } = usePurchaseCart();
  const topPadding = useHeaderTopPadding(8);
  const tabBarHeight = useBottomTabBarHeight();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [categoria, setCategoria] = useState('todas');
  const [aviso, setAviso] = useState('');

  /** Antes o item entrava na sacola sem nenhum retorno na tela. */
  const adicionarProduto = async (produto: Produto) => {
    const { adicionado, motivo } = await addItem(produto, {
      id: fornecedorId,
      nome: fornecedorNome,
    });
    setAviso(
      adicionado ? `${produto.nome} adicionado à sacola.` : motivo ?? 'Não foi possível adicionar.',
    );
  };

  const chips = useMemo(() => {
    const extras = CATEGORIAS.filter((cat) => {
      if (cat.id === 'todas') return true;
      return produtos.some((p) => cat.keywords.some((k) => textoProduto(p).includes(k)));
    });
    return extras.length > 1 ? extras : CATEGORIAS.slice(0, 5);
  }, [produtos]);

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    const cat = CATEGORIAS.find((c) => c.id === categoria);
    return produtos.filter((p) => {
      const texto = textoProduto(p);
      const passaBusca = !termo || p.nome.toLowerCase().includes(termo) || texto.includes(termo);
      const passaCat =
        !cat || cat.id === 'todas' || cat.keywords.some((k) => texto.includes(k));
      return passaBusca && passaCat;
    });
  }, [produtos, search, categoria]);

  const capa = getImageUrl(capaUrl);
  const tipoLabel = labelTipoFornecedor(tipo ?? 'DISTRIBUIDOR');

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 64 }}
      >
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerSide} onPress={onBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <BrandLogo variant="azul" height={34} />
            <TouchableOpacity
              style={styles.headerSide}
              onPress={() => setNotificationsOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#9AA3B2" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar neste quiosque"
              placeholderTextColor="#9AA3B2"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.banner}>
          {capa ? (
            <RemoteImage
              uri={capa}
              style={styles.bannerImage}
              fallbackLabel={fornecedorNome}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient colors={['#FFAD19', '#FFD873']} style={styles.bannerImage} />
          )}
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerSlogan}>Tudo em bebidas para o seu negócio.</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <RemoteImage
            uri={getImageUrl(logoUrl)}
            style={styles.logo}
            fallbackLabel={fornecedorNome}
            resizeMode="cover"
          />

          <Text style={styles.storeTitle}>{fornecedorNome}</Text>
          <Text style={styles.storeDesc}>
            {descricao || 'Bebidas em geral com as melhores marcas e condições para o seu negócio.'}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#8A93A3" />
              <Text style={styles.metaText}>Distribuidora</Text>
            </View>
            <View style={styles.openBadge}>
              <Text style={styles.openText}>Aberto</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={14} color="#8A93A3" />
              <Text style={styles.metaText}>{tipoLabel}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="cube-outline" size={20} color={PRIMARY} />
              <Text style={styles.statLabel}>
                {produtos.length}{'\n'}Produtos
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="storefront-outline" size={20} color={PRIMARY} />
              <Text style={styles.statLabel}>Retirada{'\n'}na loja</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bicycle-outline" size={20} color={PRIMARY} />
              <Text style={styles.statLabel}>Entrega{'\n'}na região</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Bebidas disponíveis</Text>
          {aviso ? <Text style={styles.avisoSacola}>{aviso}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {chips.map((chip) => {
              const active = categoria === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoria(chip.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : filtrados.length === 0 ? (
            <Text style={styles.empty}>Nenhuma bebida disponível neste quiosque.</Text>
          ) : (
            <View style={styles.grid}>
              {filtrados.map((produto) => {
                const emEstoque = normalizarEstoque(produto.estoque) > 0;
                return (
                  <TouchableOpacity
                    key={produto.id}
                    style={styles.productCard}
                    onPress={() => onOpenProduct(produto)}
                    activeOpacity={0.85}
                  >
                    <RemoteImage
                      uri={getImageUrl(produto.imagemUrl)}
                      style={styles.productImage}
                      fallbackLabel={produto.nome}
                      resizeMode="cover"
                    />
                    <Text style={styles.productName} numberOfLines={2}>
                      {produto.nome}
                    </Text>
                    <Text style={styles.productUnit}>{produto.unidade || 'un'}</Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice} numberOfLines={1}>
                        {formatarPreco(produto.precoVenda)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.addButton, !emEstoque && { opacity: 0.4 }]}
                        disabled={!emEstoque}
                        onPress={() => void adicionarProduto(produto)}
                      >
                        <Ionicons name="add" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.stockLabel, !emEstoque && { color: '#C62828' }]}>
                      {emEstoque ? 'Em estoque' : 'Esgotado'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.cartBar, { marginBottom: 8 }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Reservas')}
      >
        <View style={styles.cartBarLeft}>
          <Ionicons name="cart-outline" size={20} color="#FFF" />
          <Text style={styles.cartBarText}>Ver carrinho</Text>
        </View>
        <Text style={styles.cartBarCount}>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</Text>
      </TouchableOpacity>

      <BottomTabBar activeRoute="Explorar" />

      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        empresaId={user?.empresa?.id}
      />
    </View>
  );
}
