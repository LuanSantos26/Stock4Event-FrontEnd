import type { FinanceiroResumo } from '../../types/financeiro';
import { calcularIndicadores, formatarValorCurto, montarSerieMensal } from '../graficosFinanceiro';

function resumo(parcial: Partial<FinanceiroResumo> = {}): FinanceiroResumo {
  return {
    lucroTotal: 0,
    lucroMesAtual: 0,
    mediaLucroMensal: 0,
    margemLucroPercentual: 0,
    mediaPedidosMensais: 0,
    totalPedidosMesAtual: 0,
    totalComprasMesAtual: 0,
    mediaComprasMensais: 0,
    lucrosMensais: [
      { mes: '2026-09', label: 'Set', lucro: -50, gastos: 150 },
      { mes: '2026-10', label: 'Out', lucro: 200, gastos: 100 },
    ],
    comprasMensais: [
      { mes: '2026-09', label: 'Set', valor: 150 },
      { mes: '2026-10', label: 'Out', valor: 100 },
    ],
    vendasMensais: [
      { mes: '2026-09', label: 'Set', valor: 100 },
      { mes: '2026-10', label: 'Out', valor: 300 },
    ],
    pedidosMensais: [
      { mes: '2026-09', label: 'Set', quantidade: 1 },
      { mes: '2026-10', label: 'Out', quantidade: 3 },
    ],
    formasPagamento: [],
    ...parcial,
  };
}

describe('montarSerieMensal', () => {
  it('usa a série da métrica e calcula a altura pelo maior valor', () => {
    expect(montarSerieMensal(resumo(), 'Vendas')).toEqual([
      { label: 'Set', valor: 100, alturaPercentual: 33 },
      { label: 'Out', valor: 300, alturaPercentual: 100 },
    ]);
    expect(montarSerieMensal(resumo(), 'Compras').map((b) => b.valor)).toEqual([150, 100]);
  });

  it('lucro negativo usa o valor absoluto para a altura', () => {
    expect(montarSerieMensal(resumo(), 'Lucro')).toEqual([
      { label: 'Set', valor: -50, alturaPercentual: 25 },
      { label: 'Out', valor: 200, alturaPercentual: 100 },
    ]);
  });

  it('sem resumo ou sem valores não divide por zero', () => {
    expect(montarSerieMensal(null, 'Vendas')).toEqual([]);
    const zerado = resumo({ vendasMensais: [{ mes: '2026-10', label: 'Out', valor: 0 }] });
    expect(montarSerieMensal(zerado, 'Vendas')[0].alturaPercentual).toBe(0);
  });
});

describe('calcularIndicadores', () => {
  it('receita, ticket médio e margem do período', () => {
    expect(calcularIndicadores(resumo())).toEqual({ receita: 400, ticketMedio: 100, margemPercentual: 38 });
  });

  it('prefere os totais acumulados quando a API manda', () => {
    const r = resumo({ totalVendasAcumulado: 1000, totalComprasAcumulado: 400 });
    expect(calcularIndicadores(r)).toEqual({ receita: 1000, ticketMedio: 250, margemPercentual: 60 });
  });

  it('sem vendas fica tudo zero', () => {
    expect(calcularIndicadores(null)).toEqual({ receita: 0, ticketMedio: 0, margemPercentual: 0 });
    expect(calcularIndicadores(resumo({ vendasMensais: [], pedidosMensais: [] })).ticketMedio).toBe(0);
  });
});

describe('formatarValorCurto', () => {
  it('abrevia milhares e milhões', () => {
    expect(formatarValorCurto(850)).toBe('850');
    expect(formatarValorCurto(1250)).toBe('1,3 mil');
    expect(formatarValorCurto(2_000_000)).toBe('2 mi');
    expect(formatarValorCurto(-1500)).toBe('-1,5 mil');
  });
});
