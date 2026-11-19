import type { FinanceiroResumo } from '../../types/financeiro';
import {
  calcularEscala,
  calcularIndicadores,
  formatarValorCurto,
  montarSerieBalanco,
  montarSerieMensal,
} from '../graficosFinanceiro';

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
  });

  it('compras ficam negativas, abaixo do zero', () => {
    expect(montarSerieMensal(resumo(), 'Compras')).toEqual([
      { label: 'Set', valor: -150, alturaPercentual: 100 },
      { label: 'Out', valor: -100, alturaPercentual: 67 },
    ]);
  });

  it('lucro positivo sobe e prejuízo desce, cada um na sua faixa', () => {
    expect(montarSerieMensal(resumo(), 'Lucro')).toEqual([
      { label: 'Set', valor: -50, alturaPercentual: 100 },
      { label: 'Out', valor: 200, alturaPercentual: 100 },
    ]);
  });

  it('sem resumo ou sem valores não divide por zero', () => {
    expect(montarSerieMensal(null, 'Vendas')).toEqual([]);
    const zerado = resumo({ vendasMensais: [{ mes: '2026-10', label: 'Out', valor: 0 }] });
    expect(montarSerieMensal(zerado, 'Vendas')[0].alturaPercentual).toBe(0);
  });
});

describe('calcularEscala', () => {
  it('divide o gráfico na proporção dos maiores valores de cada lado', () => {
    expect(calcularEscala([200, -50])).toEqual({ maiorPositivo: 200, maiorNegativo: 50, fracaoPositiva: 0.8 });
  });

  it('só positivos usa o gráfico todo para cima, só negativos todo para baixo', () => {
    expect(calcularEscala([10, 30]).fracaoPositiva).toBe(1);
    expect(calcularEscala([-10, -30]).fracaoPositiva).toBe(0);
    expect(calcularEscala([]).fracaoPositiva).toBe(1);
  });
});

describe('montarSerieBalanco', () => {
  it('põe o lucro acima e as compras abaixo do zero, na mesma escala', () => {
    expect(montarSerieBalanco(resumo())).toEqual([
      { label: 'Set', lucro: -50, compras: -150, alturaLucro: 33, alturaCompras: 100 },
      { label: 'Out', lucro: 200, compras: -100, alturaLucro: 100, alturaCompras: 67 },
    ]);
  });

  it('sem resumo devolve vazio', () => {
    expect(montarSerieBalanco(null)).toEqual([]);
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
