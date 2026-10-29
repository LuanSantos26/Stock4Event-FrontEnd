import { Produto } from './productService';
import { apiFetch, parseResponse } from './http';
import type {
  Fornecedor,
  ItemSolicitacao,
  EtapaPedido,
  SolicitacaoCompra,
  MetodoPagamento,
  ItemSolicitacaoPayload,
  SolicitacaoCompraPayload,
} from '../types';
import type { ProdutoRecente, QuiosqueDisponivel } from '../types/marketplace';

export type { ProdutoRecente, QuiosqueDisponivel };
export type {
  Fornecedor,
  ItemSolicitacao,
  EtapaPedido,
  SolicitacaoCompra,
  MetodoPagamento,
  ItemSolicitacaoPayload,
  SolicitacaoCompraPayload,
};

/** Produtos das distribuidoras (exceto a própria empresa), dos cadastrados mais recentemente. */
export async function listarProdutosRecentes(limite = 20): Promise<ProdutoRecente[]> {
  const response = await apiFetch(`/api/marketplace/produtos-recentes?limite=${limite}`);
  const lista = await parseResponse<ProdutoRecente[]>(response, 'Não foi possível carregar os produtos.');
  return lista.map((p) => ({
    ...p,
    precoVenda: Number(p.precoVenda),
    estoque: p.estoque != null ? Number(p.estoque) : undefined,
  }));
}

/** Quiosques ativos das outras contas, com o que está à venda. */
export async function listarQuiosquesDisponiveis(busca = ''): Promise<QuiosqueDisponivel[]> {
  const query = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
  const response = await apiFetch(`/api/marketplace/quiosques${query}`);
  const lista = await parseResponse<QuiosqueDisponivel[]>(response, 'Não foi possível carregar os quiosques.');
  return lista.map((q) => ({
    ...q,
    produtos: q.produtos.map((p) => ({ ...p, precoVenda: Number(p.precoVenda) })),
  }));
}

function normalizeProduto(data: Produto): Produto {
  return {
    ...data,
    precoVenda: Number(data.precoVenda),
    estoque: data.estoque != null ? Number(data.estoque) : undefined,
  };
}

function normalizeSolicitacao(data: SolicitacaoCompra): SolicitacaoCompra {
  return {
    ...data,
    pedidoId: data.pedidoId != null ? Number(data.pedidoId) : undefined,
    valorTotal: Number(data.valorTotal),
    taxaEntrega: data.taxaEntrega != null ? Number(data.taxaEntrega) : undefined,
    previsaoEntregaMinutos:
      data.previsaoEntregaMinutos != null ? Number(data.previsaoEntregaMinutos) : undefined,
    itens: (data.itens ?? []).map((item) => ({
      ...item,
      quantidade: Number(item.quantidade),
      precoUnitario: Number(item.precoUnitario),
      subtotal: Number(item.subtotal),
    })),
  };
}

export function obterPrevisaoEntrega(pedido: SolicitacaoCompra): string {
  if (pedido.previsaoEntregaLabel) return pedido.previsaoEntregaLabel;

  switch (pedido.status) {
    case 'entregue':
      return 'Pedido entregue';
    case 'cancelada':
      return 'Pedido cancelado';
    case 'em_rota':
      return 'Chegada em até 15 min';
    default:
      return 'Previsão de entrega: 40–55 min';
  }
}

export function calcularProgressoPedido(pedido: SolicitacaoCompra): number {
  const etapas = pedido.etapas ?? [];
  if (etapas.length === 0) {
    // Sem as etapas do servidor, estima pelo status (4 etapas = 0,25 cada).
    if (pedido.status === 'entregue') return 1;
    if (pedido.status === 'em_rota') return 0.75;
    if (pedido.status === 'preparando') return 0.5;
    return 0.25;
  }
  const concluidas = etapas.filter((e) => e.concluida).length;
  return Math.min(1, concluidas / etapas.length);
}

export async function listarFornecedores(empresaCompradoraId?: number): Promise<Fornecedor[]> {
  const query = empresaCompradoraId ? `?empresaCompradoraId=${empresaCompradoraId}` : '';
  const response = await apiFetch(`/api/marketplace/fornecedores${query}`);
  return parseResponse<Fornecedor[]>(response);
}

export async function listarProdutosFornecedor(fornecedorId: number): Promise<Produto[]> {
  const response = await apiFetch(`/api/marketplace/fornecedores/${fornecedorId}/produtos`,
  );
  const lista = await parseResponse<Produto[]>(response);
  return lista.map(normalizeProduto);
}

export async function criarSolicitacaoCompra(
  payload: SolicitacaoCompraPayload,
): Promise<SolicitacaoCompra> {
  const response = await apiFetch(`/api/solicitacoes-compra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return normalizeSolicitacao(await parseResponse<SolicitacaoCompra>(response));
}

export async function listarSolicitacoes(
  empresaCompradoraId: number,
): Promise<SolicitacaoCompra[]> {
  const response = await apiFetch(`/api/solicitacoes-compra?empresaCompradoraId=${empresaCompradoraId}`,
  );
  const lista = await parseResponse<SolicitacaoCompra[]>(response);
  return lista.map(normalizeSolicitacao);
}

export async function buscarSolicitacao(
  pedidoId: number,
  empresaCompradoraId: number,
): Promise<SolicitacaoCompra> {
  const response = await apiFetch(`/api/solicitacoes-compra/${pedidoId}?empresaCompradoraId=${empresaCompradoraId}`,
  );
  return normalizeSolicitacao(await parseResponse<SolicitacaoCompra>(response));
}

/** Pedidos recebidos pelo fornecedor. */
export async function listarSolicitacoesRecebidas(
  empresaFornecedoraId: number,
): Promise<SolicitacaoCompra[]> {
  const response = await apiFetch(`/api/solicitacoes-compra/recebidas?empresaFornecedoraId=${empresaFornecedoraId}`,
  );
  const lista = await parseResponse<SolicitacaoCompra[]>(
    response,
    'Não foi possível carregar os pedidos recebidos.',
    { treatOutdatedServer: true },
  );
  return lista.map(normalizeSolicitacao);
}

/** Etapas que o fornecedor aciona à mão, na ordem, mais o cancelamento. */
export type StatusPedidoFornecedor = 'preparando' | 'em_rota' | 'entregue' | 'cancelada';

export async function atualizarStatusSolicitacao(
  pedidoId: number,
  empresaFornecedoraId: number,
  status: StatusPedidoFornecedor,
): Promise<SolicitacaoCompra> {
  const response = await apiFetch(`/api/solicitacoes-compra/${pedidoId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresaFornecedoraId, status }),
  });
  return normalizeSolicitacao(
    await parseResponse<SolicitacaoCompra>(
      response,
      'Não foi possível atualizar o pedido.',
      { treatOutdatedServer: true },
    ),
  );
}

/** Comprador cancela enquanto o pedido ainda não saiu para entrega. */
export async function cancelarSolicitacao(
  pedidoId: number,
  empresaCompradoraId: number,
): Promise<SolicitacaoCompra> {
  const response = await apiFetch(`/api/solicitacoes-compra/${pedidoId}/cancelar?empresaCompradoraId=${empresaCompradoraId}`,
    { method: 'PATCH' },
  );
  return normalizeSolicitacao(
    await parseResponse<SolicitacaoCompra>(
      response,
      'Não foi possível cancelar o pedido.',
      { treatOutdatedServer: true },
    ),
  );
}

export function labelStatusPedido(status: string): string {
  switch (status) {
    case 'recebido':
      return 'Pedido recebido';
    case 'preparando':
      return 'Preparando pedido';
    case 'em_rota':
      return 'Pedido saiu para a entrega';
    case 'entregue':
      return 'Entregue';
    case 'cancelada':
      return 'Pedido cancelado';
    default:
      return 'Pedido em andamento';
  }
}

export function labelMetodoPagamento(metodo?: string): string {
  switch (metodo) {
    case 'pix':
      return 'PIX';
    case 'credito':
      return 'Cartão de crédito';
    case 'debito':
      return 'Cartão de débito';
    case 'dinheiro':
      return 'Dinheiro';
    default:
      return metodo ?? '—';
  }
}

export function labelTipoFornecedor(tipo: string): string {
  if (tipo === 'PLATAFORMA') return 'Plataforma';
  if (tipo === 'DISTRIBUIDOR') return 'Distribuidora';
  return tipo;
}
