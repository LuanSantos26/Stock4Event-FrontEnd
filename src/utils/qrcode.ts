import qrcode from '../vendor/qrcode-generator';

// Pix copia e cola é ASCII, mas usamos UTF-8 para qualquer texto.
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

/**
 * Gera a matriz de módulos de um QR Code (true = módulo escuro).
 * Nível de correção M (padrão usado pelos bancos para Pix).
 */
export function gerarMatrizQr(texto: string, nivel: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean[][] {
  const qr = qrcode(0, nivel);
  qr.addData(texto, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const matriz: boolean[][] = [];
  for (let l = 0; l < n; l++) {
    const linha: boolean[] = [];
    for (let c = 0; c < n; c++) linha.push(qr.isDark(l, c));
    matriz.push(linha);
  }
  return matriz;
}

/** Agrupa módulos escuros consecutivos de uma linha em segmentos [início, tamanho]. */
export function segmentosEscuros(linha: boolean[]): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let inicio = -1;
  for (let i = 0; i <= linha.length; i++) {
    const escuro = i < linha.length && linha[i];
    if (escuro && inicio < 0) inicio = i;
    if (!escuro && inicio >= 0) {
      segs.push([inicio, i - inicio]);
      inicio = -1;
    }
  }
  return segs;
}
