import {
  crc16,
  fatorVencimento,
  gerarBoleto,
  gerarPixCopiaECola,
  modulo10,
  modulo11Boleto,
  normalizarChavePix,
} from '../pagamentoSimulado';

describe('Pix copia e cola', () => {
  it('CRC16-CCITT bate com o valor de referência', () => {
    // "123456789" → 0x29B1 no CRC-16/CCITT-FALSE
    expect(crc16('123456789')).toBe('29B1');
  });

  it('monta o BR Code com chave, valor, nome e CRC válido no fim', () => {
    const codigo = gerarPixCopiaECola({
      chave: '12.345.678/0001-95',
      tipoChave: 'cnpj',
      nomeRecebedor: 'Cervejaria Caruaru Ltda',
      valor: 107.5,
      txid: 'PED-42',
    });
    expect(codigo.startsWith('000201')).toBe(true);
    expect(codigo).toContain('0014br.gov.bcb.pix0114' + '12345678000195');
    expect(codigo).toContain('5406107.50');
    expect(codigo).toContain('5923CERVEJARIA CARUARU LTDA');
    expect(codigo).toContain('62090505PED42');
    const semCrc = codigo.slice(0, -4);
    expect(semCrc.endsWith('6304')).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(semCrc));
  });

  it('normaliza a chave conforme o tipo', () => {
    expect(normalizarChavePix('telefone', '(81) 99999-0000')).toBe('+5581999990000');
    expect(normalizarChavePix('cpf', '123.456.789-01')).toBe('12345678901');
    expect(normalizarChavePix('email', ' Loja@Exemplo.com ')).toBe('loja@exemplo.com');
  });
});

describe('Boleto', () => {
  it('módulo 10 e módulo 11 seguem o exemplo da FEBRABAN', () => {
    expect(modulo10('001905009')).toBe(5);
    expect(modulo11Boleto('0019373700000001000500940144816060680935031')).toBe(3);
  });

  it('fator de vencimento recomeça em 1000 depois de 21/02/2025', () => {
    expect(fatorVencimento(new Date(2000, 6, 3))).toBe('1000');
    expect(fatorVencimento(new Date(2025, 1, 21))).toBe('9999');
    expect(fatorVencimento(new Date(2025, 1, 22))).toBe('1000');
    expect(fatorVencimento(new Date(2025, 1, 23))).toBe('1001');
  });

  it('gera linha digitável de 47 dígitos coerente com o código de barras', () => {
    const { codigoBarras, linhaDigitavel } = gerarBoleto({
      bancoCodigo: '1',
      agencia: '1234',
      conta: '12345-6',
      valor: 107.5,
      vencimento: new Date(2026, 10, 3),
      nossoNumero: 42,
    });
    expect(codigoBarras).toHaveLength(44);
    expect(codigoBarras.startsWith('0019')).toBe(true);
    const digitos = linhaDigitavel.replace(/\D/g, '');
    expect(digitos).toHaveLength(47);
    // DV geral (posição 33 da linha) = posição 5 do código de barras
    expect(digitos[32]).toBe(codigoBarras[4]);
    // Valor no fim da linha
    expect(digitos.slice(-10)).toBe('0000010750');
    // DV do código de barras confere
    expect(modulo11Boleto(codigoBarras.slice(0, 4) + codigoBarras.slice(5))).toBe(Number(codigoBarras[4]));
    // DVs dos três primeiros campos conferem
    expect(modulo10(digitos.slice(0, 9))).toBe(Number(digitos[9]));
    expect(modulo10(digitos.slice(10, 20))).toBe(Number(digitos[20]));
    expect(modulo10(digitos.slice(21, 31))).toBe(Number(digitos[31]));
  });
});
