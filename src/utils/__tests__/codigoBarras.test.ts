import { codigoBarrasValido, digitoVerificadorGs1, normalizarCodigoBarras, pareceCodigoBarras } from '../codigoBarras';

describe('codigoBarras', () => {
  it('valida EAN-13, EAN-8 e UPC-A pelo dígito verificador', () => {
    expect(codigoBarrasValido('7891000100103')).toBe(true);
    expect(codigoBarrasValido('96385074')).toBe(true);
    expect(codigoBarrasValido('036000291452')).toBe(true);
    expect(codigoBarrasValido('7891000100104')).toBe(false);
    expect(codigoBarrasValido('12345')).toBe(false);
  });

  it('calcula o mesmo dígito do back-end para o código interno', () => {
    expect(digitoVerificadorGs1('200070001234')).toBe(9);
  });

  it('normaliza e reconhece leitura de leitor', () => {
    expect(normalizarCodigoBarras(' 789-1000 100103 ')).toBe('7891000100103');
    expect(pareceCodigoBarras('7891000100103')).toBe(true);
    expect(pareceCodigoBarras('cerveja')).toBe(false);
    expect(pareceCodigoBarras('123')).toBe(false);
  });
});
