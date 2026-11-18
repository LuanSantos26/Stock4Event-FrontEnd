import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { usePurchaseCart } from '../../context/PurchaseCartContext';
import {
  buscarProduto,
  corEstoque,
  labelEstoque,
  normalizarEstoque,
} from '../../services/productService';
import { listarProdutosFornecedor, vendePorPalete } from '../../services/marketplaceService';
import { unidadesNaSacola } from '../../utils/sacolaCarrinho';
import type { TipoVenda } from '../../types/marketplace';

import { useAuth } from '../../context/AuthContext';

export const GOLD = '#FFAD19';

export function useProductDetail() {

  const navigation = useNavigation<any>();
  const { perfilUso, user } = useAuth();
  const goBack = useAppGoBack(perfilUso === 'Cliente' ? 'Explorar' : 'Cart');
  const route = useRoute<any>();
  const { addItem, itemCount, itens } = usePurchaseCart();

  const fornecedorId = route.params?.fornecedorId as number;
  /** Produto da própria empresa (conta cliente e fornecedor): não dá para comprar de si mesmo. */
  const produtoProprio = !!fornecedorId && fornecedorId === user?.empresa?.id;
  const fornecedorNome = route.params?.fornecedorNome as string ?? 'Distribuidora';
  const fornecedorDescricao = route.params?.fornecedorDescricao as string | undefined;
  const fornecedorLogoUrl = route.params?.fornecedorLogoUrl as string | undefined;
  const produtoId = route.params?.produtoId as number;
  const origem = route.params?.origem as string | undefined;
  const isCatalogo = origem === 'catalogo';

  const [productName, setProductName] = useState(route.params?.productName || 'Produto');
  const [descricao, setDescricao] = useState(route.params?.descricao as string | undefined);
  const [imagemUrl, setImagemUrl] = useState(route.params?.imagemUrl as string | undefined);
  const [unidade, setUnidade] = useState((route.params?.unidade as string) ?? 'UN');
  const [precoVenda, setPrecoVenda] = useState(Number(route.params?.precoVenda ?? 0));
  const [estoque, setEstoque] = useState(normalizarEstoque(route.params?.estoque));
  const [productCodigo, setProductCodigo] = useState(route.params?.codigo as string | undefined);
  const [precoPalete, setPrecoPalete] = useState<number | null>(null);
  const [unidadesPorPalete, setUnidadesPorPalete] = useState<number | null>(null);
  /** O cliente escolhe comprar por unidade ou em palete fechado (quando o fornecedor oferece). */
  const [tipoVenda, setTipoVendaState] = useState<TipoVenda>('unidade');
  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [adding, setAdding] = useState(false);

  // Unidades desse produto já na sacola, somando as vendidas por unidade e por palete.
  const qtdNoCarrinho = useMemo(
    () => unidadesNaSacola(itens, fornecedorId, produtoId),
    [itens, fornecedorId, produtoId],
  );

  const temPalete = vendePorPalete({ precoPalete, unidadesPorPalete });
  const porPalete = temPalete && tipoVenda === 'palete';
  const fator = porPalete ? (unidadesPorPalete as number) : 1;
  /** Preço do que o cliente está comprando agora: uma unidade ou um palete. */
  const precoSelecionado = porPalete ? (precoPalete as number) : precoVenda;

  const estoqueRestante = isCatalogo
    ? estoque
    : Math.max(0, estoque - qtdNoCarrinho);
  /** Quantas unidades ou paletes ainda cabem no estoque. */
  const maximoSelecionavel = Math.floor(estoqueRestante / fator);
  const esgotado = porPalete ? maximoSelecionavel <= 0 : estoqueRestante <= 0;

  const setTipoVenda = useCallback((tipo: TipoVenda) => {
    setTipoVendaState(tipo);
    setQuantity(1);
    setFeedback('');
  }, []);
  const estoqueLabel = labelEstoque(isCatalogo ? estoque : estoqueRestante);
  const estoqueColor = corEstoque(isCatalogo ? estoque : estoqueRestante);

  const carregarProduto = useCallback(async () => {
    if (!produtoId) return;
    setLoading(true);
    try {
      if (isCatalogo) {
        const produto = await buscarProduto(produtoId);
        setProductName(produto.nome);
        setDescricao(produto.descricao);
        setImagemUrl(produto.imagemUrl);
        setUnidade(produto.unidade);
        setPrecoVenda(produto.precoVenda);
        setEstoque(normalizarEstoque(produto.estoque));
        setProductCodigo(produto.codigo);
        setPrecoPalete(produto.precoPalete ?? null);
        setUnidadesPorPalete(produto.unidadesPorPalete ?? null);
        return;
      }

      if (!fornecedorId) return;
      const lista = await listarProdutosFornecedor(fornecedorId);
      const produto = lista.find((p) => p.id === produtoId);
      if (produto) {
        setProductName(produto.nome);
        setDescricao(produto.descricao);
        setImagemUrl(produto.imagemUrl);
        setUnidade(produto.unidade);
        setPrecoVenda(produto.precoVenda);
        setEstoque(normalizarEstoque(produto.estoque));
        setProductCodigo(produto.codigo);
        setPrecoPalete(produto.precoPalete ?? null);
        setUnidadesPorPalete(produto.unidadesPorPalete ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [fornecedorId, produtoId, isCatalogo]);

  useFocusEffect(
    useCallback(() => {
      carregarProduto();
    }, [carregarProduto]),
  );

  const handleAddToCart = async () => {
    if (!fornecedorId || !produtoId) {
      setFeedback('Produto ou fornecedor inválido.');
      return;
    }

    if (produtoProprio) {
      setFeedback('Este produto é da sua empresa: não é possível comprar de si mesmo.');
      return;
    }

    if (esgotado) {
      setFeedback(
        porPalete
          ? `O estoque não completa um palete (${estoqueRestante} un. disponíveis).`
          : 'Produto esgotado no momento.',
      );
      return;
    }

    if (quantity > maximoSelecionavel) {
      setFeedback(
        porPalete
          ? `Cabem no máximo ${maximoSelecionavel} palete(s).`
          : `Apenas ${estoqueRestante} unidade(s) disponível(is).`,
      );
      return;
    }

    setAdding(true);
    setFeedback('');

    const { adicionado, motivo } = await addItem(
      {
        id: produtoId,
        empresaId: fornecedorId,
        nome: productName,
        precoVenda,
        unidade,
        descricao,
        imagemUrl,
        ativo: 1,
        // Estoque total: a sacola já desconta o que estiver nela.
        estoque,
        precoPalete,
        unidadesPorPalete,
      },
      { id: fornecedorId, nome: fornecedorNome },
      quantity,
      porPalete ? 'palete' : 'unidade',
    );

    setAdding(false);

    setFeedback(
      adicionado
        ? 'Produto adicionado à sacola!'
        : motivo ?? 'Quantidade indisponível em estoque.',
    );
  };

  return {
    navigation,
    goBack,
    itemCount,
    fornecedorNome,
    fornecedorDescricao,
    fornecedorLogoUrl,
    fornecedorId,
    isCatalogo,
    productName,
    descricao,
    imagemUrl,
    unidade,
    precoVenda,
    precoPalete,
    unidadesPorPalete,
    temPalete,
    tipoVenda: porPalete ? ('palete' as TipoVenda) : ('unidade' as TipoVenda),
    setTipoVenda,
    precoSelecionado,
    maximoSelecionavel,
    productCodigo,
    loading,
    quantity,
    setQuantity,
    observation,
    setObservation,
    feedback,
    adding,
    estoque,
    estoqueRestante,
    esgotado,
    estoqueLabel,
    estoqueColor,
    handleAddToCart,
    GOLD,
  };
}
