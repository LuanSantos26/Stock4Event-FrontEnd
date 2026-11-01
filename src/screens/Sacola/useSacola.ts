import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useProdutos } from '../../context/ProductsContext';
import { TAXA_ENTREGA, usePurchaseCart } from '../../context/PurchaseCartContext';
import {
  criarSolicitacaoCompra,
  MetodoPagamento,
  SolicitacaoCompra,
} from '../../services/marketplaceService';
import {
  FormaPagamentoSalva,
  listarFormasPagamento,
} from '../../services/formaPagamentoService';
import {
  EnderecoEntrega,
  listarEnderecos,
  obterEnderecoSelecionado,
  resolverEnderecoInicial,
  salvarEnderecoSelecionado,
} from '../../services/enderecoService';
import { CheckoutPaymentResult, RecebedorCheckout } from '../../components/Card/CheckoutPaymentModal';
import { useTabBarScrollPadding } from '../../components/layout/BottomTabBar';

/** Opções do checkout. "Cartão" abre a escolha entre crédito e débito no modal de pagamento. */
export const METODOS_PADRAO: { id: MetodoPagamento; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'credito', label: 'Cartão' },
  { id: 'boleto', label: 'Boleto' },
];

export function useSacola() {
  const navigation = useNavigation<any>();
  const scrollBottomPadding = useTabBarScrollPadding();
  const scrollBottomPaddingWithFooter = useTabBarScrollPadding(72);
  const { user } = useAuth();
  const { refresh: refreshProdutos } = useProdutos();
  const {
    gruposFornecedor,
    itemCount,
    total,
    taxaEntregaTotal,
    updateQuantity,
    removeItem,
    clear,
  } = usePurchaseCart();
  const [editMode, setEditMode] = useState(false);
  const [enderecos, setEnderecos] = useState<EnderecoEntrega[]>([]);
  const [enderecoErro, setEnderecoErro] = useState('');
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<EnderecoEntrega | null>(null);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoSalva[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento | null>(null);
  const [loadingEnderecos, setLoadingEnderecos] = useState(false);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [formasErro, setFormasErro] = useState('');
  const [modalEndereco, setModalEndereco] = useState(false);
  const [modalCadastroEndereco, setModalCadastroEndereco] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalPagamento, setModalPagamento] = useState(false);

  const carregarEnderecos = useCallback(async () => {
    if (!user?.empresa?.id) return;
    setLoadingEnderecos(true);
    setEnderecoErro('');
    try {
      const lista = await listarEnderecos(user.empresa.id);
      const salvoId = await obterEnderecoSelecionado();
      setEnderecos(lista);
      setEnderecoSelecionado(resolverEnderecoInicial(lista, salvoId));
    } catch (err) {
      setEnderecoErro(err instanceof Error ? err.message : 'Erro ao carregar endereços.');
    } finally {
      setLoadingEnderecos(false);
    }
  }, [user?.empresa?.id]);

  const carregarFormasPagamento = useCallback(async () => {
    if (!user?.empresa?.id) return;
    setLoadingFormas(true);
    setFormasErro('');
    try {
      const lista = await listarFormasPagamento(user.empresa.id);
      setFormasPagamento(lista);
      setMetodoPagamento((atual) => {
        if (atual && lista.some((f) => f.tipo === atual)) return atual;
        const principal = lista.find((f) => f.principal);
        return (principal?.tipo ?? lista[0]?.tipo ?? null) as MetodoPagamento | null;
      });
    } catch (err) {
      setFormasErro(err instanceof Error ? err.message : 'Erro ao carregar formas de pagamento.');
      setFormasPagamento([]);
      setMetodoPagamento(null);
    } finally {
      setLoadingFormas(false);
    }
  }, [user?.empresa?.id]);

  useFocusEffect(
    useCallback(() => {
      carregarEnderecos();
      carregarFormasPagamento();
      return () => setEditMode(false);
    }, [carregarEnderecos, carregarFormasPagamento]),
  );

  useEffect(() => {
    if (itemCount === 0) setEditMode(false);
  }, [itemCount]);

  const handleClearAll = () => {
    Alert.alert('Remover todos', 'Deseja remover todos os itens da sacola?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover todos',
        style: 'destructive',
        onPress: () => {
          clear();
          setEditMode(false);
        },
      },
    ]);
  };

  const formatItemCount = (count: number): string => {
    if (count === 0) return '0 itens';
    if (count === 1) return '1 item';
    return `${count} itens`;
  };

  const selecionarEndereco = async (endereco: EnderecoEntrega) => {
    setEnderecoSelecionado(endereco);
    await salvarEnderecoSelecionado(endereco.id);
    setModalEndereco(false);
  };

  const handleEnderecoSalvo = async (endereco: EnderecoEntrega) => {
    setEnderecos((prev) => {
      const exists = prev.some((e) => e.id === endereco.id);
      if (exists) return prev;
      return [endereco, ...prev];
    });
    setEnderecoSelecionado(endereco);
    await salvarEnderecoSelecionado(endereco.id);
    setEnderecoErro('');
  };

  const abrirSelecaoEndereco = () => {
    if (enderecos.length === 0) {
      setModalCadastroEndereco(true);
    } else {
      setModalEndereco(true);
    }
  };

  const handleSubmit = () => {
    setError('');
    setSuccessMessage('');
    if (!user?.empresa?.id || !user.id || gruposFornecedor.length === 0) {
      setError('Carrinho inválido. Adicione produtos antes de finalizar.');
      return;
    }
    if (!enderecoSelecionado) {
      setError('Cadastre ou selecione um endereço de entrega.');
      return;
    }
    if (!metodoPagamento) {
      setMetodoPagamento('pix');
    }
    setModalPagamento(true);
  };

  const processarCheckout = async (pagamento: CheckoutPaymentResult) => {
    setModalPagamento(false);
    setError('');
    setSuccessMessage('');
    if (!user?.empresa?.id || !user.id || !enderecoSelecionado) return;
    setLoading(true);
    const falhas: string[] = [];
    const pedidosCriados: SolicitacaoCompra[] = [];
    try {
      for (const grupo of gruposFornecedor) {
        try {
          const pedido = await criarSolicitacaoCompra({
            empresaCompradoraId: user.empresa.id,
            empresaFornecedoraId: grupo.fornecedorId,
            usuarioId: user.id,
            metodoPagamento: pagamento.metodoPagamento,
            enderecoEntregaId: enderecoSelecionado.id,
            taxaEntrega: TAXA_ENTREGA,
            pagamentoReferencia:
              pagamento.porFornecedor?.[grupo.fornecedorId]?.pagamentoReferencia ?? pagamento.pagamentoReferencia,
            pagamentoDetalhes:
              pagamento.porFornecedor?.[grupo.fornecedorId]?.pagamentoDetalhes ?? pagamento.pagamentoDetalhes,
            itens: grupo.itens.map((item) => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
            })),
          });
          pedidosCriados.push(pedido);
        } catch {
          falhas.push(grupo.fornecedorNome);
        }
      }
      if (falhas.length === 0 && pedidosCriados.length > 0) {
        clear();
        await refreshProdutos();
        const primeiro = pedidosCriados[0];
        navigation.navigate('PedidoAcompanhamento', {
          pedidoId: primeiro.id,
          pedidoInicial: primeiro,
          pedidosIds: pedidosCriados.map((p) => p.id),
        });
        return;
      }
      if (falhas.length === gruposFornecedor.length) {
        setError('Não foi possível enviar os pedidos. Tente novamente.');
      } else {
        setError(`Falha ao enviar pedido(s) de: ${falhas.join(', ')}. Tente novamente.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const totalComTaxa = total + (itemCount > 0 ? taxaEntregaTotal : 0);
  // Cada fornecedor recebe o próprio subtotal mais a taxa de entrega do pedido dele.
  const recebedores = useMemo<RecebedorCheckout[]>(
    () =>
      gruposFornecedor.map((g) => ({
        fornecedorId: g.fornecedorId,
        fornecedorNome: g.fornecedorNome,
        valor: g.subtotal + TAXA_ENTREGA,
      })),
    [gruposFornecedor],
  );
  const sacolaVazia = itemCount === 0;
  const pedidoCount = gruposFornecedor.length;
  const taxaEntregaLabel =
    pedidoCount > 1 ? `Taxa de entrega (${pedidoCount} pedidos)` : 'Taxa de entrega';

  return {
    navigation,
    scrollBottomPadding,
    scrollBottomPaddingWithFooter,
    user,
    gruposFornecedor,
    recebedores,
    itemCount,
    total,
    taxaEntregaTotal,
    updateQuantity,
    removeItem,
    editMode,
    setEditMode,
    enderecos,
    enderecoErro,
    enderecoSelecionado,
    formasPagamento,
    metodoPagamento,
    setMetodoPagamento,
    loadingEnderecos,
    loadingFormas,
    formasErro,
    modalEndereco,
    setModalEndereco,
    modalCadastroEndereco,
    setModalCadastroEndereco,
    loading,
    error,
    successMessage,
    modalPagamento,
    setModalPagamento,
    carregarEnderecos,
    carregarFormasPagamento,
    handleClearAll,
    formatItemCount,
    selecionarEndereco,
    handleEnderecoSalvo,
    abrirSelecaoEndereco,
    handleSubmit,
    processarCheckout,
    totalComTaxa,
    sacolaVazia,
    pedidoCount,
    taxaEntregaLabel,
  };
}
