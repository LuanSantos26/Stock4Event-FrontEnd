import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { usePurchaseCart } from '../../context/PurchaseCartContext';
import {
  Fornecedor,
  listarFornecedores,
  listarProdutosRecentes,
} from '../../services/marketplaceService';
import { formatarPreco, Produto, normalizarEstoque } from '../../services/productService';
import { useBottomTabBarHeight } from '../../components/layout/BottomTabBar';

export type CategoriaId = 'aguas' | 'refrigerantes' | 'sucos' | 'cervejas';

export const CATEGORIAS: {
  id: CategoriaId;
  label: string;
  icon: 'water-outline' | 'beer-outline' | 'wine-outline' | 'pint-outline';
  color: string;
  keywords: string[];
}[] = [
  {
    id: 'aguas',
    label: 'Águas',
    icon: 'water-outline',
    color: '#D8EEF8',
    keywords: ['água', 'agua', 'mineral', 'sem gás', 'com gás', 'cristal'],
  },
  {
    id: 'refrigerantes',
    label: 'Refrigerantes',
    icon: 'pint-outline',
    color: '#F8D7DE',
    keywords: ['refrigerante', 'cola', 'guaraná', 'guarana', 'soda', 'fanta', 'sprite'],
  },
  {
    id: 'sucos',
    label: 'Sucos',
    icon: 'wine-outline',
    color: '#F8E7B0',
    // Só termos de suco: 'laranja' sozinho colocava a Fanta Laranja (SaborViva) em Sucos.
    keywords: ['suco', 'néctar', 'nectar'],
  },
  {
    id: 'cervejas',
    label: 'Cervejas',
    icon: 'beer-outline',
    color: '#D8F0D4',
    keywords: ['cerveja', 'beer', 'pilsen', 'lager', 'ipa', 'chopp'],
  },
];

const DISTANCIAS = ['1,0 km', '1,2 km', '2,4 km', '0,8 km', '3,1 km'];

export interface ProdutoExplorar extends Produto {
  fornecedorNome: string;
  /** Produto da própria empresa (conta cliente e fornecedor). */
  proprio?: boolean;
}

function textoProduto(produto: Produto) {
  return `${produto.nome} ${produto.descricao ?? ''} ${produto.unidade}`.toLowerCase();
}

/** Se o produto pertence à categoria (pelas palavras-chave do nome, descrição e unidade). */
export function produtoDaCategoria(produto: Produto, categoria: CategoriaId): boolean {
  const keywords = CATEGORIAS.find((c) => c.id === categoria)?.keywords ?? [];
  return keywords.some((palavra) => textoProduto(produto).includes(palavra));
}

export function useExplorar() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { addItem } = usePurchaseCart();
  const empresaId = user?.empresa?.id;
  const tabBarHeight = useBottomTabBarHeight();

  const [lojas, setLojas] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<ProdutoExplorar[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // Produtos cadastrados pelas contas fornecedoras (exceto a própria), mais recentes primeiro.
      const [listaLojas, recentes] = await Promise.all([
        listarFornecedores(empresaId),
        listarProdutosRecentes(0).catch(() => [] as ProdutoExplorar[]),
      ]);
      setLojas(listaLojas);
      setProdutos(recentes);
    } catch {
      setLojas([]);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const termo = busca.trim().toLowerCase();

  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (categoria) {
      const porCategoria = lista.filter((p) => produtoDaCategoria(p, categoria));
      if (porCategoria.length > 0) lista = porCategoria;
    }
    if (!termo) return lista;
    return lista.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        p.fornecedorNome.toLowerCase().includes(termo) ||
        (p.descricao?.toLowerCase().includes(termo) ?? false),
    );
  }, [produtos, categoria, termo]);

  const lojasFiltradas = useMemo(() => {
    if (!termo) return lojas;
    return lojas.filter(
      (l) =>
        l.nome.toLowerCase().includes(termo) ||
        (l.descricao?.toLowerCase().includes(termo) ?? false),
    );
  }, [lojas, termo]);

  const produtosDestaque = produtosFiltrados.slice(0, 8);
  const lojasDestaque = lojasFiltradas.slice(0, 6);

  const distanciaDaLoja = (index: number) => DISTANCIAS[index % DISTANCIAS.length];

  const abrirLoja = (loja: Fornecedor) => {
    navigation.navigate('StoreVitrine', {
      fornecedorId: loja.id,
      fornecedorNome: loja.nome,
      descricao: loja.descricao,
      logoUrl: loja.logoUrl,
      capaUrl: loja.capaUrl,
      tipo: loja.tipo,
    });
  };

  const abrirProduto = (produto: ProdutoExplorar) => {
    navigation.navigate('ProductDetail', {
      produtoId: produto.id,
      fornecedorId: produto.empresaId,
      fornecedorNome: produto.fornecedorNome,
      productName: produto.nome,
      price: formatarPreco(produto.precoVenda),
      precoVenda: produto.precoVenda,
      descricao: produto.descricao,
      imagemUrl: produto.imagemUrl,
      unidade: produto.unidade,
      estoque: produto.estoque,
      codigo: produto.codigo,
      origem: 'marketplace',
    });
  };

  const adicionarProduto = async (produto: ProdutoExplorar) => {
    if (produto.proprio || normalizarEstoque(produto.estoque) <= 0) return;
    await addItem(produto, { id: produto.empresaId, nome: produto.fornecedorNome });
  };

  const toggleCategoria = (id: CategoriaId) => {
    setCategoria((atual) => (atual === id ? null : id));
  };

  const verTodosProdutos = () => navigation.navigate('ExplorarLista', { tipo: 'produtos', categoria });
  const verTodasDistribuidoras = () => navigation.navigate('ExplorarLista', { tipo: 'distribuidoras' });

  const limparFiltros = () => {
    setCategoria(null);
    setBusca('');
  };

  return {
    loading,
    busca,
    setBusca,
    categoria,
    toggleCategoria,
    limparFiltros,
    verTodosProdutos,
    verTodasDistribuidoras,
    produtosDestaque,
    lojasDestaque,
    tabBarHeight,
    distanciaDaLoja,
    abrirLoja,
    abrirProduto,
    adicionarProduto,
    formatarPreco,
    normalizarEstoque,
  };
}
