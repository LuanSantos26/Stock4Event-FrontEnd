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
import type {
  ProdutoRecente,
  QuiosqueDisponivel,
  TipoEntrega,
  TipoVenda,
} from '../types/marketplace';

export type { ProdutoRecente, QuiosqueDisponivel, TipoEntrega, TipoVenda };

function numeroOuNulo(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Palete só vale com preço e quantidade de unidades juntos. */
export function vendePorPalete(produto: {
  precoPalete?: number | null;
  unidadesPorPalete?: number | null;
}): boolean {
  return (produto.precoPalete ?? 0) > 0 && (produto.unidadesPorPalete ?? 0) > 0;
}
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
    precoPalete: numeroOuNulo(p.precoPalete),
    unidadesPorPalete: numeroOuNulo(p.unidadesPorPalete),
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
    precoPalete: numeroOuNulo(data.precoPalete),
    unidadesPorPalete: numeroOuNulo(data.unidadesPorPalete),
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
      tipoVenda: item.tipoVenda === 'palete' ? 'palete' : 'unidade',
      quantidadePaletes: numeroOuNulo(item.quantidadePaletes),
      precoPalete: numeroOuNulo(item.precoPalete),
      unidadesPorPalete: numeroOuNulo(item.unidadesPorPalete),
    })),
    tipoEntrega: data.tipoEntrega === 'retirada' ? 'retirada' : 'entrega',
  };
}

export function obterPrevisaoEntrega(pedido: SolicitacaoCompra): string {
  if (pedido.previsaoEntregaLabel) return pedido.previsaoEntregaLabel;

  if (pedido.tipoEntrega === 'retirada') {
    switch (pedido.status) {
      case 'entregue':
        return 'Retirada concluída';
      case 'cancelada':
        return 'Pedido cancelado';
      case 'pronto_retirada':
        return 'Pronto! Retire no local e toque em Concluir retirada';
      default:
        return 'Avisaremos quando estiver pronto para retirada';
    }
  }

  switch (pedido.status) {
    case 'entregue':
      return 'Entrega concluída';
    case 'cancelada':
      return 'Pedido cancelado';
    case 'em_rota':
      return 'Chegada em até 15 min. Ao receber, toque em Concluir entrega';
    default:
      return 'Previsão de entrega: 40–55 min';
  }
}

/** Etapas na ordem em que o fornecedor as atualiza (o mesmo fluxo do servidor). */
export const FLUXO_ENTREGA = [
  'aguardando_liberacao',
  'em_separacao',
  'abastecendo',
  'em_rota',
  'entregue',
] as const;

export const FLUXO_RETIRADA = [
  'aguardando_liberacao',
  'em_separacao',
  'pronto_retirada',
  'entregue',
] as const;

export function fluxoDoPedido(pedido: Pick<SolicitacaoCompra, 'tipoEntrega'>): readonly string[] {
  return pedido.tipoEntrega === 'retirada' ? FLUXO_RETIRADA : FLUXO_ENTREGA;
}

export function calcularProgressoPedido(pedido: SolicitacaoCompra): number {
  const etapas = pedido.etapas ?? [];
  if (etapas.length === 0) {
    // Sem as etapas do servidor, estima pela posição do status no fluxo.
    if (pedido.status === 'entregue') return 1;
    const fluxo = fluxoDoPedido(pedido);
    const indice = fluxo.indexOf(pedido.status);
    if (indice < 0) return 1 / fluxo.length;
    return Math.min(1, (indice + 1) / fluxo.length);
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

/** Etapas que o fornecedor aciona à mão, uma por vez, mais o cancelamento. */
export type StatusPedidoFornecedor =
  | 'em_separacao'
  | 'abastecendo'
  | 'em_rota'
  | 'pronto_retirada'
  | 'entregue'
  | 'cancelada';

/**
 * Próxima etapa que o fornecedor pode marcar, ou null. Ele vai até "em rota" (ou "pronto
 * para retirada"): o último passo, "entregue", só o cliente marca, ao concluir a entrega.
 */
export function proximaEtapaFornecedor(
  pedido: Pick<SolicitacaoCompra, 'status' | 'tipoEntrega'>,
): StatusPedidoFornecedor | null {
  const fluxo = fluxoDoPedido(pedido);
  const indice = fluxo.indexOf(pedido.status);
  if (indice < 0 || indice >= fluxo.length - 2) return null;
  return fluxo[indice + 1] as StatusPedidoFornecedor;
}

/** O pedido já está com o cliente (em rota ou pronto para retirada), esperando ele concluir. */
export function aguardandoConclusaoCliente(
  pedido: Pick<SolicitacaoCompra, 'status' | 'tipoEntrega'>,
): boolean {
  const fluxo = fluxoDoPedido(pedido);
  return pedido.status === fluxo[fluxo.length - 2];
}

/** Texto do botão com que o cliente conclui o pedido. */
export function labelAcaoCliente(retirada: boolean): string {
  return retirada ? 'Concluir retirada' : 'Concluir entrega';
}

/** Texto do botão que o fornecedor toca para avançar o pedido. */
export function labelAcaoFornecedor(status: StatusPedidoFornecedor, retirada: boolean): string {
  switch (status) {
    case 'em_separacao':
      return 'Separar produtos';
    case 'abastecendo':
      return 'Abastecer o carro';
    case 'em_rota':
      return 'Saiu para entrega';
    case 'pronto_retirada':
      return 'Pronto para retirada';
    case 'entregue':
      return retirada ? 'Confirmar retirada' : 'Confirmar entrega';
    default:
      return 'Cancelar';
  }
}

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

/** Cliente confirma que recebeu (ou retirou) o pedido: último passo da logística. */
export async function concluirSolicitacao(
  pedidoId: number,
  empresaCompradoraId: number,
): Promise<SolicitacaoCompra> {
  const response = await apiFetch(`/api/solicitacoes-compra/${pedidoId}/concluir?empresaCompradoraId=${empresaCompradoraId}`,
    { method: 'PATCH' },
  );
  return normalizeSolicitacao(
    await parseResponse<SolicitacaoCompra>(
      response,
      'Não foi possível concluir o pedido.',
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

export function labelStatusPedido(status: string, tipoEntrega?: TipoEntrega): string {
  switch (status) {
    case 'aguardando_liberacao':
      return 'Pedido recebido';
    case 'em_separacao':
      return 'Produto em separação';
    case 'abastecendo':
      return 'Abastecendo o carro';
    case 'em_rota':
      return 'A caminho, em rota';
    case 'pronto_retirada':
      return 'Pronto para retirada';
    case 'entregue':
      return tipoEntrega === 'retirada' ? 'Retirada concluída' : 'Entrega concluída';
    case 'cancelada':
      return 'Pedido cancelado';
    default:
      return 'Pedido em andamento';
  }
}

/** "2 paletes (48 un.)" ou "5 un." — como o item aparece no pedido. */
export function descreverQuantidadeItem(item: ItemSolicitacao): string {
  if (item.tipoVenda === 'palete' && item.quantidadePaletes) {
    const n = item.quantidadePaletes;
    return `${n} ${n === 1 ? 'palete' : 'paletes'} (${item.quantidade} un.)`;
  }
  return `${item.quantidade} ${item.unidade || 'un.'}`;
}

export function labelMetodoPagamento(metodo?: string): string {
  switch (metodo) {
    case 'pix':
      return 'PIX';
    case 'credito':
      return 'Cartão de crédito';
    case 'debito':
      return 'Cartão de débito';
    case 'boleto':
      return 'Boleto';
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
