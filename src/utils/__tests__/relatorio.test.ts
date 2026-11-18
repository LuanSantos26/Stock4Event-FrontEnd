import {
  dataISO,
  deslocarData,
  rotuloPeriodo,
  ehPeriodoAtualOuFuturo,
  nomeArquivo,
  gerarCsvRelatorio,
  gerarHtmlRelatorio,
  dataHoraCurta,
} from '../relatorio';
import { normalizarRelatorio, type Relatorio } from '../../services/relatorioService';

function relatorio(parcial: Partial<Relatorio> = {}): Relatorio {
  return normalizarRelatorio({
    perfil: 'fornecedor',
    periodo: 'mes',
    titulo: 'Vendas — novembro de 2026',
    empresaNome: 'Refri Agreste',
    inicio: '2026-11-01',
    fim: '2026-11-30',
    geradoEm: '2026-11-18T10:30:00',
    totalPedidos: 2,
    concluidos: 1,
    emAndamento: 0,
    cancelados: 1,
    valorTotal: '1234.5',
    valorConcluido: '1234.5',
    ticketMedio: '1234.5',
    unidades: '24',
    produtos: [{ nome: 'Coca-Cola Lata', unidades: '24', valor: '83.76' }],
    contrapartes: [{ nome: 'Bar do Zé; Filial "Centro"', pedidos: 1, valor: '1234.5' }],
    pedidos: [
      { id: 7, criadoEm: '2026-11-05T14:05:31', contraparte: 'Bar do Zé; Filial "Centro"', tipoEntrega: 'entrega', status: 'entregue', statusLabel: 'Entrega concluída', metodoPagamento: 'pix', valor: '1234.5' },
      { id: 8, criadoEm: '2026-11-06T09:00:00', contraparte: 'Mercado <Sol>', tipoEntrega: 'retirada', status: 'cancelada', statusLabel: 'Cancelado', metodoPagamento: 'boleto', valor: '50' },
    ],
    ...parcial,
  });
}

describe('datas do relatório', () => {
  it('formata a data local como AAAA-MM-DD', () => {
    expect(dataISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('anda dia, mês e ano, virando o mês e o ano', () => {
    expect(dataISO(deslocarData(new Date(2026, 10, 30), 'dia', 1))).toBe('2026-12-01');
    expect(dataISO(deslocarData(new Date(2026, 0, 31), 'mes', -1))).toBe('2025-12-01');
    expect(dataISO(deslocarData(new Date(2026, 5, 15), 'ano', 1))).toBe('2027-01-01');
  });

  it('dá o rótulo de cada período', () => {
    const d = new Date(2026, 10, 18);
    expect(rotuloPeriodo(d, 'dia')).toBe('18/11/2026');
    expect(rotuloPeriodo(d, 'mes')).toBe('Novembro de 2026');
    expect(rotuloPeriodo(d, 'ano')).toBe('2026');
  });

  it('não deixa avançar para o futuro', () => {
    const hoje = new Date(2026, 10, 18);
    expect(ehPeriodoAtualOuFuturo(new Date(2026, 10, 18), 'dia', hoje)).toBe(true);
    expect(ehPeriodoAtualOuFuturo(new Date(2026, 10, 17), 'dia', hoje)).toBe(false);
    expect(ehPeriodoAtualOuFuturo(new Date(2026, 10, 1), 'mes', hoje)).toBe(true);
    expect(ehPeriodoAtualOuFuturo(new Date(2026, 9, 1), 'mes', hoje)).toBe(false);
    expect(ehPeriodoAtualOuFuturo(new Date(2025, 0, 1), 'ano', hoje)).toBe(false);
  });

  it('mostra a hora do servidor sem mudar o fuso', () => {
    expect(dataHoraCurta('2026-11-05T14:05:31')).toBe('05/11/2026 14:05');
  });
});

describe('arquivos do relatório', () => {
  it('dá nomes de arquivo por tipo e período', () => {
    expect(nomeArquivo(relatorio(), 'pdf')).toBe('relatorio-vendas-mes-2026-11.pdf');
    expect(nomeArquivo(relatorio({ perfil: 'cliente', periodo: 'dia', inicio: '2026-11-18' }), 'csv'))
      .toBe('relatorio-compras-dia-2026-11-18.csv');
    expect(nomeArquivo(relatorio({ periodo: 'ano', inicio: '2026-01-01' }), 'csv')).toBe('relatorio-vendas-ano-2026.csv');
  });

  it('gera CSV com ponto e vírgula, vírgula decimal e aspas onde precisa', () => {
    const linhas = gerarCsvRelatorio(relatorio()).split('\r\n');
    expect(linhas[0]).toBe('Pedido;Data;Cliente;Tipo;Status;Pagamento;Valor (R$)');
    expect(linhas[1]).toBe('#7;05/11/2026 14:05;"Bar do Zé; Filial ""Centro""";Entrega;Entrega concluída;PIX;1234,50');
    expect(linhas[2]).toContain('Retirada;Cancelado;Boleto;50,00');
    expect(linhas[linhas.length - 1]).toBe('Total (sem cancelados);;;;;;1234,50');
  });

  it('usa "Distribuidora" no relatório do cliente', () => {
    expect(gerarCsvRelatorio(relatorio({ perfil: 'cliente' })).split('\r\n')[0]).toContain(';Distribuidora;');
  });

  it('gera o HTML com os totais e escapa o texto', () => {
    const html = gerarHtmlRelatorio(relatorio());
    expect(html).toContain('Vendas — novembro de 2026');
    expect(html).toContain('Mercado &lt;Sol&gt;');
    expect(html).not.toContain('Mercado <Sol>');
    expect(html).toContain('class="cancelado"');
    expect(html).toMatch(/R\$\s?1\.234,50/);
  });
});
