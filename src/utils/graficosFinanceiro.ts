import type { FinanceiroResumo } from '../types/financeiro';

/**
 * Vendas: barras para cima. Compras: barras para baixo (dinheiro que sai, valor negativo).
 * Lucro: para cima quando positivo, para baixo quando é prejuízo.
 * Lucro × Compras: as duas séries no mesmo gráfico, lucro acima e compras abaixo do zero.
 */
export type MetricaGrafico = 'Vendas' | 'Compras' | 'Lucro' | 'Lucro × Compras';

export interface BarraGrafico {
  label: string;
  /** Valor com sinal: compras e prejuízo são negativos. */
  valor: number;
  /** Altura da barra em % (0–100) dentro da sua faixa: acima do zero ou abaixo dele. */
  alturaPercentual: number;
}

export interface BarraBalanco {
  label: string;
  lucro: number;
  /** Sempre ≤ 0: o que foi gasto em compras no mês. */
  compras: number;
  alturaLucro: number;
  alturaCompras: number;
}

/**
 * Quanto do gráfico fica acima da linha do zero (0–1). O resto fica abaixo.
 * Assim positivos e negativos usam a mesma escala: R$ 100 acima tem a mesma altura que R$ 100 abaixo.
 */
export interface EscalaGrafico {
  maiorPositivo: number;
  maiorNegativo: number;
  fracaoPositiva: number;
}

export interface IndicadoresGrafico {
  receita: number;
  ticketMedio: number;
  margemPercentual: number;
}

/** Escala com o zero no meio: o espaço acima e abaixo é proporcional aos maiores valores de cada lado. */
export function calcularEscala(valores: number[]): EscalaGrafico {
  const maiorPositivo = Math.max(0, ...valores);
  const maiorNegativo = Math.max(0, ...valores.map((v) => -v));
  const total = maiorPositivo + maiorNegativo;
  return {
    maiorPositivo,
    maiorNegativo,
    fracaoPositiva: total > 0 ? maiorPositivo / total : 1,
  };
}

function alturaNaFaixa(valor: number, escala: EscalaGrafico): number {
  const limite = valor >= 0 ? escala.maiorPositivo : escala.maiorNegativo;
  return limite > 0 ? Math.round((Math.abs(valor) / limite) * 100) : 0;
}

/** Valores com sinal da métrica escolhida (compras viram negativas). */
function valoresDaMetrica(resumo: FinanceiroResumo, metrica: MetricaGrafico): { label: string; valor: number }[] {
  if (metrica === 'Vendas') {
    return (resumo.vendasMensais ?? []).map((m) => ({ label: m.label, valor: m.valor }));
  }
  if (metrica === 'Compras') {
    return resumo.comprasMensais.map((m) => ({ label: m.label, valor: -Math.abs(m.valor) }));
  }
  return resumo.lucrosMensais.map((m) => ({ label: m.label, valor: m.lucro }));
}

/** Série mensal de uma métrica, com a altura de cada barra na sua faixa (acima ou abaixo do zero). */
export function montarSerieMensal(resumo: FinanceiroResumo | null, metrica: MetricaGrafico): BarraGrafico[] {
  if (!resumo || metrica === 'Lucro × Compras') return [];
  const valores = valoresDaMetrica(resumo, metrica);
  const escala = calcularEscala(valores.map((v) => v.valor));
  return valores.map((v) => ({ ...v, alturaPercentual: alturaNaFaixa(v.valor, escala) }));
}

/** Lucro (acima do zero) e compras (abaixo do zero) de cada mês, na mesma escala. */
export function montarSerieBalanco(resumo: FinanceiroResumo | null): BarraBalanco[] {
  if (!resumo) return [];
  const comprasPorMes = new Map(resumo.comprasMensais.map((m) => [m.mes, m.valor]));
  const meses = resumo.lucrosMensais.map((m) => ({
    label: m.label,
    lucro: m.lucro,
    compras: -Math.abs(comprasPorMes.get(m.mes) ?? m.gastos ?? 0),
  }));
  const escala = calcularEscala(meses.flatMap((m) => [m.lucro, m.compras]));
  return meses.map((m) => ({
    ...m,
    alturaLucro: alturaNaFaixa(m.lucro, escala),
    alturaCompras: alturaNaFaixa(m.compras, escala),
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
