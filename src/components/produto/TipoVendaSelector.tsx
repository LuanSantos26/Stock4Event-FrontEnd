import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarPreco } from '../../services/productService';
import { COMPANY_COLORS } from '../../theme/theme';
import type { TipoVenda } from '../../types/marketplace';

interface Props {
  tipoVenda: TipoVenda;
  onChange: (tipo: TipoVenda) => void;
  precoVenda: number;
  precoPalete: number;
  unidadesPorPalete: number;
  unidade: string;
}

/**
 * Escolha entre comprar por unidade ou em palete fechado.
 * Só aparece quando o fornecedor cadastrou o preço do palete.
 */
export function TipoVendaSelector({
  tipoVenda,
  onChange,
  precoVenda,
  precoPalete,
  unidadesPorPalete,
  unidade,
}: Props) {
  const precoPorUnidadeNoPalete = precoPalete / unidadesPorPalete;
  const economia = precoVenda > 0 ? 1 - precoPorUnidadeNoPalete / precoVenda : 0;

  const opcoes: {
    id: TipoVenda;
    titulo: string;
    preco: string;
    detalhe: string;
    icone: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      id: 'unidade',
      titulo: 'Por unidade',
      preco: formatarPreco(precoVenda),
      detalhe: `por ${unidade || 'unidade'}`,
      icone: 'cube-outline',
    },
    {
      id: 'palete',
      titulo: 'Palete fechado',
      preco: formatarPreco(precoPalete),
      detalhe:
        `${unidadesPorPalete} un. · ${formatarPreco(precoPorUnidadeNoPalete)}/un.` +
        (economia >= 0.01 ? ` · ${Math.round(economia * 100)}% mais barato` : ''),
      icone: 'albums-outline',
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Como você quer comprar?</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {opcoes.map((opcao) => {
          const selecionado = tipoVenda === opcao.id;
          return (
            <TouchableOpacity
              key={opcao.id}
              style={[styles.option, selecionado && styles.optionSelected]}
              onPress={() => onChange(opcao.id)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionado }}
            >
              <View style={styles.optionHeader}>
                <Ionicons
                  name={opcao.icone}
                  size={16}
                  color={selecionado ? '#FFF' : COMPANY_COLORS.primary}
                />
                <Text style={[styles.optionTitle, selecionado && styles.textSelected]}>
                  {opcao.titulo}
                </Text>
              </View>
              <Text style={[styles.optionPrice, selecionado && styles.textSelected]}>{opcao.preco}</Text>
              <Text style={[styles.optionDetail, selecionado && styles.detailSelected]}>
                {opcao.detalhe}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D8DEE8',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFF',
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: COMPANY_COLORS.primary,
    borderColor: COMPANY_COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COMPANY_COLORS.primary,
  },
  optionPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 6,
  },
  optionDetail: {
    fontSize: 12,
    color: '#5B6472',
    marginTop: 2,
  },
  textSelected: {
    color: '#FFF',
  },
  detailSelected: {
    color: '#E4ECF8',
  },
});
