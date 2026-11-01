import type { FinanceiroResumo } from '../types/financeiro';

export type MetricaGrafico = 'Vendas' | 'Compras' | 'Lucro';

export interface BarraGrafico {
  label: string;
  valor: number;
  /** Altura da barra em % (0–100), proporcional ao maior valor absoluto da série. */
  alturaPercentual: number;
}

export interface IndicadoresGrafico {
  receita: number;
  ticketMedio: number;
  margemPercentual: number;
}

/** Série mensal da métrica escolhida, já com a altura de cada barra. */
export function montarSerieMensal(resumo: FinanceiroResumo | null, metrica: MetricaGrafico): BarraGrafico[] {
  if (!resumo) return [];

  const valores =
    metrica === 'Vendas'
      ? (resumo.vendasMensais ?? []).map((m) => ({ label: m.label, valor: m.valor }))
      : metrica === 'Compras'
        ? resumo.comprasMensais.map((m) => ({ label: m.label, valor: m.valor }))
        : resumo.lucrosMensais.map((m) => ({ label: m.label, valor: m.lucro }));

  const maior = Math.max(0, ...valores.map((v) => Math.abs(v.valor)));
  return valores.map((v) => ({
    ...v,
    alturaPercentual: maior > 0 ? Math.round((Math.abs(v.valor) / maior) * 100) : 0,
  }));
}

/** Receita total das vendas, ticket médio por venda e margem (lucro ÷ vendas) do período. */
export function calcularIndicadores(resumo: FinanceiroResumo | null): IndicadoresGrafico {
  if (!resumo) return { receita: 0, ticketMedio: 0, margemPercentual: 0 };

  const receita =
    resumo.totalVendasAcumulado ?? (resumo.vendasMensais ?? []).reduce((acc, m) => acc + m.valor, 0);
  const compras =
    resumo.totalComprasAcumulado ?? resumo.comprasMensais.reduce((acc, m) => acc + m.valor, 0);
  const vendas = resumo.pedidosMensais.reduce((acc, m) => acc + Number(m.quantidade), 0);

  return {
    receita,
    ticketMedio: vendas > 0 ? receita / vendas : 0,
    margemPercentual: receita > 0 ? Math.round(((receita - compras) / receita) * 100) : 0,
  };
}

/** Rótulo curto em cima da barra: 850 → "850", 1.250 → "1,3 mil", 2.000.000 → "2 mi". */
export function formatarValorCurto(valor: number): string {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? '-' : '';
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${sinal}${fmt(abs / 1_000_000)} mi`;
  if (abs >= 1_000) return `${sinal}${fmt(abs / 1_000)} mil`;
  return `${sinal}${Math.round(abs)}`;
}
