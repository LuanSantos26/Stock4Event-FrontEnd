import { apiFetch, parseResponse } from './http';

export type PeriodoRelatorio = 'dia' | 'mes' | 'ano';
/** fornecedor: relatório de vendas. cliente: relatório de compras. */
export type PerfilRelatorio = 'fornecedor' | 'cliente';

export interface RelatorioProduto {
  nome: string;
  unidades: number;
  valor: number;
}

export interface RelatorioContraparte {
  nome: string;
  pedidos: number;
  valor: number;
}

export interface RelatorioPedido {
  id: number;
  criadoEm: string;
  contraparte: string;
  tipoEntrega: string;
  status: string;
  statusLabel: string;
  metodoPagamento?: string | null;
  valor: number;
}

export interface Relatorio {
  perfil: PerfilRelatorio;
  periodo: PeriodoRelatorio;
  titulo: string;
  empresaNome: string;
  inicio: string;
  fim: string;
  geradoEm: string;
  totalPedidos: number;
  concluidos: number;
  emAndamento: number;
  cancelados: number;
  valorTotal: number;
  valorConcluido: number;
  ticketMedio: number;
  unidades: number;
  produtos: RelatorioProduto[];
  contrapartes: RelatorioContraparte[];
  pedidos: RelatorioPedido[];
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

/** O servidor manda BigDecimal; aqui tudo vira number. */
export function normalizarRelatorio(data: any): Relatorio {
  return {
    ...data,
    totalPedidos: num(data.totalPedidos),
    concluidos: num(data.concluidos),
    emAndamento: num(data.emAndamento),
    cancelados: num(data.cancelados),
    valorTotal: num(data.valorTotal),
    valorConcluido: num(data.valorConcluido),
    ticketMedio: num(data.ticketMedio),
    unidades: num(data.unidades),
    produtos: (data.produtos ?? []).map((p: any) => ({ ...p, unidades: num(p.unidades), valor: num(p.valor) })),
    contrapartes: (data.contrapartes ?? []).map((c: any) => ({ ...c, pedidos: num(c.pedidos), valor: num(c.valor) })),
    pedidos: (data.pedidos ?? []).map((p: any) => ({ ...p, valor: num(p.valor) })),
  };
}

export async function buscarRelatorio(
  empresaId: number,
  perfil: PerfilRelatorio,
  periodo: PeriodoRelatorio,
  dataISO: string,
): Promise<Relatorio> {
  const response = await apiFetch(
    `/api/relatorios?empresaId=${empresaId}&perfil=${perfil}&periodo=${periodo}&data=${dataISO}`,
  );
  return normalizarRelatorio(
    await parseResponse<unknown>(response, 'Não foi possível gerar o relatório.', { treatOutdatedServer: true }),
  );
}
