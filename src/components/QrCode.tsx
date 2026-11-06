import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { gerarMatrizQr, segmentosEscuros } from '../utils/qrcode';

interface Props {
  value: string;
  /** Lado total em pixels, incluindo a margem branca. */
  size?: number;
  /** Margem branca em módulos (o padrão do QR é 4). */
  margem?: number;
  cor?: string;
  fundo?: string;
}

/** QR Code desenhado só com Views — funciona no Expo Go, iOS, Android e web sem dependência nativa. */
export function QrCode({ value, size = 200, margem = 4, cor = '#000000', fundo = '#FFFFFF' }: Props) {
  const matriz = useMemo(() => {
    try {
      return gerarMatrizQr(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matriz) return null;

  const total = matriz.length + margem * 2;
  const modulo = size / total;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR Code Pix"
      style={[styles.box, { width: size, height: size, backgroundColor: fundo }]}
    >
      {matriz.map((linha, l) =>
        segmentosEscuros(linha).map(([inicio, tam]) => (
          <View
            key={`${l}-${inicio}`}
            style={{
              position: 'absolute',
              top: (l + margem) * modulo,
              left: (inicio + margem) * modulo,
              // +0.5 evita frestas por arredondamento de subpixel
              width: tam * modulo + 0.5,
              height: modulo + 0.5,
              backgroundColor: cor,
            }}
          />
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'relative', overflow: 'hidden', alignSelf: 'center', borderRadius: 8 },
});
