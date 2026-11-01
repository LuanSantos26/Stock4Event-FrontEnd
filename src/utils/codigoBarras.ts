/**
 * Código de barras dos produtos (EAN-8, UPC-A, EAN-13, GTIN-14).
 * Mesma regra do back-end (CodigoBarrasService): só dígitos e dígito verificador GS1 correto.
 */

export function normalizarCodigoBarras(texto: string): string {
  return texto.replace(/\D/g, '');
}

export function digitoVerificadorGs1(semDigito: string): number {
  let soma = 0;
  for (let i = 0; i < semDigito.length; i++) {
    const d = Number(semDigito[semDigito.length - 1 - i]);
    soma += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (soma % 10)) % 10;
}

export function codigoBarrasValido(codigo: string): boolean {
  if (!/^\d+$/.test(codigo)) return false;
  if (![8, 12, 13, 14].includes(codigo.length)) return false;
  return digitoVerificadorGs1(codigo.slice(0, -1)) === Number(codigo[codigo.length - 1]);
}

/**
 * Parece leitura de código de barras (e não busca por nome)? Leitores USB digitam só números
 * e terminam com Enter; nomes de produto têm letras.
 */
export function pareceCodigoBarras(texto: string): boolean {
  const t = texto.trim();
  return /^\d{8,14}$/.test(t);
}
