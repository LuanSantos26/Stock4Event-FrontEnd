import { gerarMatrizQr, segmentosEscuros } from '../qrcode';
import { gerarPixCopiaECola } from '../pagamentoSimulado';

describe('gerarMatrizQr', () => {
  const pix = gerarPixCopiaECola({
    chave: 'financeiro@fornecedor.com',
    tipoChave: 'email',
    nomeRecebedor: 'Fornecedor Demo',
    valor: 123.45,
  });

  it('gera matriz quadrada com tamanho de versão válido (21 + 4k)', () => {
    const m = gerarMatrizQr(pix);
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect((m.length - 21) % 4).toBe(0);
    m.forEach((linha) => expect(linha.length).toBe(m.length));
  });

  it('desenha os três padrões de posição nos cantos', () => {
    const m = gerarMatrizQr(pix);
    const n = m.length;
    expect(m[0][0]).toBe(true);
    expect(m[0][n - 1]).toBe(true);
    expect(m[n - 1][0]).toBe(true);
    expect(m[3][3]).toBe(true);
    expect(m[1][1]).toBe(false);
  });

  it('é determinística', () => {
    expect(gerarMatrizQr(pix)).toEqual(gerarMatrizQr(pix));
  });
});

describe('segmentosEscuros', () => {
  it('agrupa módulos escuros consecutivos', () => {
    expect(segmentosEscuros([true, true, false, true, false, false, true, true, true])).toEqual([
      [0, 2],
      [3, 1],
      [6, 3],
    ]);
    expect(segmentosEscuros([false, false])).toEqual([]);
  });
});
