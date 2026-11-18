import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EtapaPedido } from '../../../services/marketplaceService';
import { styles } from '../styles';
import { COMPANY_COLORS } from '../../../theme/theme';

export const ACCENT = COMPANY_COLORS.primary;
export const SUCCESS = '#2E7D32';
export const SUCCESS_LIGHT = '#E8F5E9';
export const POLL_INTERVAL_MS = 5000;

/** Fallback só para o primeiro render; o backend manda as etapas de verdade. */
export const ETAPAS_PADRAO: EtapaPedido[] = [
  { codigo: 'pedido_efetuado', label: 'Pedido confirmado', ordem: 1, concluida: true, ativa: false },
  { codigo: 'em_separacao', label: 'Produto em separação', ordem: 2, concluida: false, ativa: true },
  { codigo: 'abastecendo', label: 'Abastecendo o carro', ordem: 3, concluida: false, ativa: false },
  { codigo: 'em_rota', label: 'A caminho / em rota', ordem: 4, concluida: false, ativa: false },
  { codigo: 'entregue', label: 'Entrega concluída', ordem: 5, concluida: false, ativa: false },
];

export function iconeEtapa(codigo: string): keyof typeof Ionicons.glyphMap {
  switch (codigo) {
    case 'pedido_efetuado':
    case 'aguardando_liberacao':
      return 'receipt-outline';
    case 'em_separacao':
      return 'cube-outline';
    case 'abastecendo':
      return 'car-outline';
    case 'em_rota':
      return 'navigate-outline';
    case 'pronto_retirada':
      return 'storefront-outline';
    case 'entregue':
      return 'checkmark-done-outline';
    default:
      return 'ellipse-outline';
  }
}

function hintEtapa(codigo: string): string {
  switch (codigo) {
    case 'pedido_efetuado':
    case 'aguardando_liberacao':
      return 'A distribuidora recebeu seu pedido.';
    case 'em_separacao':
      return 'A distribuidora está separando seus produtos.';
    case 'abastecendo':
      return 'Os produtos estão sendo colocados no carro de entrega.';
    case 'em_rota':
      return 'O carro está a caminho do seu endereço.';
    case 'pronto_retirada':
      return 'Já pode buscar no endereço da distribuidora.';
    case 'entregue':
      return 'Produtos creditados ao seu estoque.';
    default:
      return '';
  }
}

export function TimelineStep({ etapa, isLast }: { etapa: EtapaPedido; isLast: boolean }) {
  const concluida = etapa.concluida;
  const ativa = etapa.ativa;

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndicatorCol}>
        <View
          style={[
            styles.stepCircle,
            concluida && styles.stepCircleDone,
            ativa && !concluida && styles.stepCircleActive,
          ]}
        >
          {concluida ? (
            <Ionicons name="checkmark" size={16} color="#FFF" />
          ) : (
            <Ionicons
              name={iconeEtapa(etapa.codigo)}
              size={16}
              color={ativa ? ACCENT : '#BDBDBD'}
            />
          )}
        </View>
        {!isLast ? (
          <View style={[styles.stepLine, concluida && styles.stepLineDone]} />
        ) : null}
      </View>
      <View style={[styles.stepContent, isLast && styles.stepContentLast]}>
        <Text
          style={[
            styles.stepLabel,
            concluida && styles.stepLabelDone,
            ativa && !concluida && styles.stepLabelActive,
          ]}
        >
          {etapa.label}
        </Text>
        {ativa && !concluida ? (
          <Text style={styles.stepHint}>{hintEtapa(etapa.codigo)}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProgressBar({ progress, concluido }: { progress: number; concluido?: boolean }) {
  const pct = concluido ? 100 : Math.round(progress * 100);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            concluido && styles.progressFillDone,
            { width: `${pct}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, concluido && styles.progressLabelDone]}>
        {concluido ? '100% concluído' : `${pct}% do percurso`}
      </Text>
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={ACCENT} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoText}>{value}</Text>
      </View>
    </View>
  );
}
