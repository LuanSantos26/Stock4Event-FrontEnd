import { apiFetch, parseResponse } from './http';
import type { TipoNotificacao, Notificacao } from '../types/notificacao';

export type { TipoNotificacao, Notificacao };

/** Quem vê as notificações: o fornecedor recebe só as dos pedidos que chegam para ele. */
export type PerfilNotificacao = 'cliente' | 'fornecedor';

/** Fornecedor (ou conta mista no modo fornecedor) vê só os pedidos; o resto vê as de compra. */
export function perfilDasNotificacoes(perfilUso?: string | null): PerfilNotificacao {
  return perfilUso === 'Fornecedor' ? 'fornecedor' : 'cliente';
}

export async function listarNotificacoes(
  empresaId: number,
  perfil: PerfilNotificacao = 'cliente',
): Promise<Notificacao[]> {
  const response = await apiFetch(`/api/notificacoes?empresaCompradoraId=${empresaId}&perfil=${perfil}`,
  );
  return parseResponse<Notificacao[]>(response, 'Não foi possível carregar notificações.');
}

export function labelTipoNotificacao(tipo: TipoNotificacao): string {
  if (tipo === 'compra') return 'Compra';
  if (tipo === 'pedido') return 'Pedido';
  if (tipo === 'promocao') return 'Promoção';
  if (tipo === 'sistema') return 'Sistema';
  return 'Oferta';
}

export function iconeTipoNotificacao(tipo: TipoNotificacao): string {
  if (tipo === 'compra') return 'bag-check-outline';
  if (tipo === 'pedido') return 'receipt-outline';
  if (tipo === 'promocao') return 'pricetag-outline';
  if (tipo === 'sistema') return 'sparkles-outline';
  return 'flash-outline';
}
