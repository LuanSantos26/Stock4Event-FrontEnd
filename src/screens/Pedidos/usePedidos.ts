import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  SolicitacaoCompra,
  listarSolicitacoes,
} from '../../services/marketplaceService';
import { useBottomTabBarHeight } from '../../components/layout/BottomTabBar';

export type AbaPedidos = 'realizados' | 'andamento' | 'concluidos';

export function codigoPedido(id: number): string {
  return `#QS-${String(id).padStart(4, '0')}`;
}

export function chipStatus(status: string): { label: string; tone: 'blue' | 'gold' | 'green' | 'gray' } {
  switch (status) {
    case 'recebido':
      return { label: 'Pedido recebido', tone: 'blue' };
    case 'preparando':
      return { label: 'Preparando pedido', tone: 'blue' };
    case 'em_rota':
      return { label: 'Saiu para a entrega', tone: 'gold' };
    case 'entregue':
      return { label: 'Entregue', tone: 'green' };
    case 'cancelada':
      return { label: 'Cancelado', tone: 'gray' };
    default:
      return { label: 'Pedido realizado', tone: 'gray' };
  }
}

export function unidadesPedido(pedido: SolicitacaoCompra): number {
  return pedido.itens.reduce((acc, item) => acc + item.quantidade, 0);
}

export function usePedidos() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;
  const tabBarHeight = useBottomTabBarHeight();

  const [pedidos, setPedidos] = useState<SolicitacaoCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aba, setAba] = useState<AbaPedidos>('realizados');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const lista = await listarSolicitacoes(empresaId);
      setPedidos(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const lista = useMemo(() => {
    if (aba === 'andamento') {
      return pedidos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelada');
    }
    if (aba === 'concluidos') {
      return pedidos.filter((p) => p.status === 'entregue');
    }
    return pedidos;
  }, [aba, pedidos]);

  const abrirDetalhe = (pedido: SolicitacaoCompra) => {
    navigation.navigate('PedidoAcompanhamento', {
      pedidoId: pedido.id,
      pedidoInicial: pedido,
    });
  };

  const abrirExplorar = () => navigation.navigate('Explorar');

  return {
    aba,
    setAba,
    lista,
    loading,
    error,
    tabBarHeight,
    carregar,
    abrirDetalhe,
    abrirExplorar,
  };
}
