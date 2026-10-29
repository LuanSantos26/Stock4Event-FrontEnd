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
import { listarProdutosFornecedor } from '../../services/marketplaceService';

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
  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [adding, setAdding] = useState(false);

  const qtdNoCarrinho = useMemo(
    () =>
      itens.find(
        (item) => item.fornecedorId === fornecedorId && item.produtoId === produtoId,
      )?.quantidade ?? 0,
    [itens, fornecedorId, produtoId],
  );

  const estoqueRestante = isCatalogo
    ? estoque
    : Math.max(0, estoque - qtdNoCarrinho);
  const esgotado = estoqueRestante <= 0;
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
      setFeedback('Produto esgotado no momento.');
      return;
    }

    if (quantity > estoqueRestante) {
      setFeedback(`Apenas ${estoqueRestante} unidade(s) disponível(is).`);
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
        estoque: estoqueRestante,
      },
      { id: fornecedorId, nome: fornecedorNome },
      quantity,
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
