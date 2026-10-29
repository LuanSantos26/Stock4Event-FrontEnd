import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BackButton } from '../../components/Header/BackButton';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { RemoteImage } from '../../components/media/RemoteImage';
import { getImageUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { usePurchaseCart } from '../../context/PurchaseCartContext';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { Fornecedor, listarFornecedores, listarProdutosRecentes } from '../../services/marketplaceService';
import { formatarPreco, normalizarEstoque } from '../../services/productService';
import { CLIENTE_COLORS, COMPANY_COLORS } from '../../theme/theme';
import { useBottomInset, useHeaderTopPadding } from '../../utils/safeArea';
import { normalizarBusca } from '../../utils/pdvCarrinho';
import { CATEGORIAS, CategoriaId, ProdutoExplorar, produtoDaCategoria } from '../Explorar/useExplorar';

const TEXTO = '#1F2937';
const SUAVE = '#5B6573';
const BORDA = '#E3E8EF';

type Tipo = 'produtos' | 'distribuidoras';

/** Lista completa aberta pelos botões "Ver todos"/"Ver todas": produtos dos fornecedores ou distribuidoras. */
export function ExplorarListaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tipo: Tipo = route.params?.tipo === 'distribuidoras' ? 'distribuidoras' : 'produtos';
  const goBack = useAppGoBack('Explorar');
  const { user, perfilUso } = useAuth();
  const { addItem } = usePurchaseCart();
  const topPadding = useHeaderTopPadding(8);
  const bottomInset = useBottomInset();
  const ehCliente = perfilUso !== 'Fornecedor';
  const cor = ehCliente ? CLIENTE_COLORS.primary : COMPANY_COLORS.primary;
  const corTexto = ehCliente ? '#011C46' : '#FFFFFF';
  const empresaId = user?.empresa?.id;

  const [produtos, setProdutos] = useState<ProdutoExplorar[]>([]);
  const [lojas, setLojas] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId | null>(route.params?.categoria ?? null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async (pull = false) => {
    if (!empresaId) return;
    pull ? setAtualizando(true) : setCarregando(true);
    setErro('');
    try {
      if (tipo === 'produtos') setProdutos(await listarProdutosRecentes(60));
      else setLojas(await listarFornecedores(empresaId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a lista.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [empresaId, tipo]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const termo = normalizarBusca(busca);
  const produtosFiltrados = useMemo(() => produtos.filter((p) =>
    (!categoria || produtoDaCategoria(p, categoria))
    && (!termo || normalizarBusca(`${p.nome} ${p.fornecedorNome} ${p.descricao ?? ''}`).includes(termo))), [produtos, categoria, termo]);
  const lojasFiltradas = useMemo(() => lojas.filter((l) =>
    !termo || normalizarBusca(`${l.nome} ${l.descricao ?? ''}`).includes(termo)), [lojas, termo]);

  const abrirProduto = (p: ProdutoExplorar) => navigation.navigate('ProductDetail', {
    produtoId: p.id, fornecedorId: p.empresaId, fornecedorNome: p.fornecedorNome, productName: p.nome,
    price: formatarPreco(p.precoVenda), precoVenda: p.precoVenda, descricao: p.descricao, imagemUrl: p.imagemUrl,
    unidade: p.unidade, estoque: p.estoque, codigo: p.codigo, origem: 'marketplace',
  });

  const adicionar = async (p: ProdutoExplorar) => {
    if (p.proprio || normalizarEstoque(p.estoque) <= 0) return;
    const { adicionado, motivo } = await addItem(p, { id: p.empresaId, nome: p.fornecedorNome });
    setAviso(
      adicionado
        ? `${p.nome} adicionado à sacola.`
        : motivo ?? 'Não foi possível adicionar à sacola.',
    );
  };

  const abrirLoja = (l: Fornecedor) => navigation.navigate('StoreVitrine', {
    fornecedorId: l.id, fornecedorNome: l.nome, descricao: l.descricao, logoUrl: l.logoUrl, capaUrl: l.capaUrl, tipo: l.tipo,
  });

  const renderProduto = ({ item: p }: { item: ProdutoExplorar }) => {
    const emEstoque = normalizarEstoque(p.estoque) > 0;
    const podeComprar = emEstoque && !p.proprio;
    return (
      <TouchableOpacity style={styles.linha} onPress={() => abrirProduto(p)} activeOpacity={0.85}>
        <RemoteImage uri={getImageUrl(p.imagemUrl)} style={styles.imagem} fallbackLabel={p.nome} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome} numberOfLines={2}>{p.nome}</Text>
          <Text style={styles.meta} numberOfLines={1}>{p.fornecedorNome} · {p.unidade || 'un'}</Text>
          <Text style={[styles.meta, { color: p.proprio ? '#53739A' : emEstoque ? '#1F7A3A' : '#C62828' }]}>
            {p.proprio ? 'Seu produto' : emEstoque ? 'Em estoque' : 'Esgotado'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={styles.preco}>{formatarPreco(p.precoVenda)}</Text>
          <TouchableOpacity
            style={[styles.mais, { backgroundColor: cor }, !podeComprar && { opacity: 0.4 }]}
            onPress={() => void adicionar(p)}
            disabled={!podeComprar}
            accessibilityLabel={`Adicionar ${p.nome} ao carrinho`}
          >
            <Ionicons name="add" size={18} color={corTexto} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoja = ({ item: l }: { item: Fornecedor }) => (
    <TouchableOpacity style={styles.linha} onPress={() => abrirLoja(l)} activeOpacity={0.85}>
      <RemoteImage uri={getImageUrl(l.logoUrl || l.capaUrl)} style={[styles.imagem, { borderRadius: 28 }]} fallbackLabel={l.nome} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <Text style={styles.nome} numberOfLines={1}>{l.nome}</Text>
        <Text style={styles.meta} numberOfLines={2}>{l.descricao || 'Distribuidora de bebidas'}</Text>
        <Text style={styles.meta}>{l.totalProdutos} {l.totalProdutos === 1 ? 'produto' : 'produtos'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={SUAVE} />
    </TouchableOpacity>
  );

  const titulo = tipo === 'produtos' ? 'Adicionados pelos fornecedores' : 'Distribuidoras Parceiras';
  const vazio = busca || categoria
    ? 'Nada encontrado com esses filtros.'
    : tipo === 'produtos' ? 'Nenhum produto cadastrado pelos fornecedores ainda.' : 'Nenhuma distribuidora disponível no momento.';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { backgroundColor: cor, paddingTop: topPadding }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={goBack} iconColor={ehCliente ? '#011C46' : undefined} />
          <BrandLogo variant={ehCliente ? 'azul' : 'branco'} height={28} />
          <View style={{ width: 32 }} />
        </View>
        <Text style={[styles.titulo, { color: corTexto }]}>{titulo}</Text>
        <View style={styles.busca}>
          <Ionicons name="search" size={18} color={SUAVE} />
          <TextInput
            style={styles.buscaInput}
            value={busca}
            onChangeText={setBusca}
            placeholder={tipo === 'produtos' ? 'Buscar produto ou distribuidora' : 'Buscar distribuidora'}
            placeholderTextColor={SUAVE}
            autoCorrect={false}
          />
          {!!busca && (
            <TouchableOpacity onPress={() => setBusca('')} accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={18} color={SUAVE} />
            </TouchableOpacity>
          )}
        </View>
        {tipo === 'produtos' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ id: null as CategoriaId | null, label: 'Todas' }, ...CATEGORIAS.map((c) => ({ id: c.id as CategoriaId | null, label: c.label }))].map((c) => {
              const ativo = categoria === c.id;
              return (
                <TouchableOpacity key={c.label} style={[styles.chip, ativo && styles.chipAtivo]} onPress={() => setCategoria(c.id)}>
                  <Text style={[styles.chipTexto, { color: ativo ? '#011C46' : corTexto }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}
      {carregando ? (
        <ActivityIndicator color={cor} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={(tipo === 'produtos' ? produtosFiltrados : lojasFiltradas) as any[]}
          keyExtractor={(i) => String(i.id)}
          renderItem={tipo === 'produtos' ? (renderProduto as any) : (renderLoja as any)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomInset + 24 }}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void carregar(true)} />}
          ListHeaderComponent={erro ? (
            <View style={styles.erro}>
              <Text style={styles.erroTexto}>{erro}</Text>
              <TouchableOpacity onPress={() => void carregar()}><Text style={styles.link}>Tentar novamente</Text></TouchableOpacity>
            </View>
          ) : null}
          ListEmptyComponent={erro ? null : <Text style={styles.vazio}>{vazio}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F8FB' },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 22, fontWeight: '800', marginTop: 10 },
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 12, marginTop: 12 },
  buscaInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: TEXTO },
  chips: { gap: 8, paddingTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  chipAtivo: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTexto: { fontWeight: '700', fontSize: 13 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: BORDA, padding: 10 },
  imagem: { width: 56, height: 56, borderRadius: 10 },
  nome: { fontSize: 14, fontWeight: '800', color: TEXTO },
  meta: { fontSize: 12, color: SUAVE, marginTop: 2 },
  preco: { fontSize: 15, fontWeight: '800', color: TEXTO },
  mais: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  aviso: { marginHorizontal: 16, marginTop: 10, color: '#1F7A3A', fontWeight: '700' },
  erro: { backgroundColor: '#FDECEC', borderRadius: 12, padding: 12, gap: 6 },
  erroTexto: { color: '#B42318', fontWeight: '600' },
  link: { color: '#2F95DC', fontWeight: '700' },
  vazio: { textAlign: 'center', color: SUAVE, marginTop: 32 },
});
