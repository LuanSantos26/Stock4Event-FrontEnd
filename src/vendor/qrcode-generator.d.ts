// Declaração mínima para o qrcode-generator (Kazuhiko Arase, MIT) — ver qrcode-generator.LICENSE.
type NivelCorrecao = 'L' | 'M' | 'Q' | 'H';

interface QRCodeGerado {
  addData(data: string, mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

interface QRCodeFactory {
  (typeNumber: number, errorCorrectionLevel: NivelCorrecao): QRCodeGerado;
  stringToBytes(s: string): number[];
  stringToBytesFuncs: { [encoding: string]: (s: string) => number[] };
}

declare const qrcode: QRCodeFactory;
export = qrcode;
