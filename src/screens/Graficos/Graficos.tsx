import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useAuth } from '../../context/AuthContext';
import { buscarResumoFinanceiro } from '../../services/financeiroService';
import { formatarPreco } from '../../services/productService';
import { COMPANY_COLORS } from '../../theme/theme';
import type { FinanceiroResumo } from '../../types/financeiro';
import {
  calcularEscala,
  calcularIndicadores,
  formatarValorCurto,
  montarSerieBalanco,
  montarSerieMensal,
  type MetricaGrafico,
} from '../../utils/graficosFinanceiro';

const METRICAS: MetricaGrafico[] = ['Vendas', 'Compras', 'Lucro', 'Lucro × Compras'];

const COR_VENDAS = COMPANY_COLORS.primary;
const COR_LUCRO = '#1B7A4A';
const COR_NEGATIVO = '#C0392B';

/** Altura total da área das barras; a linha do zero divide essa altura entre positivos e negativos. */
const ALTURA_GRAFICO = 200;
/** Espaço reservado para o rótulo de valor em cima (ou embaixo) de cada barra. */
const ESPACO_ROTULO = 16;

interface Barra {
  valor: number;
  altura: number;
  cor: string;
}

/**
 * Uma coluna do gráfico com o zero no meio: barras positivas sobem a partir da linha do zero,
 * negativas descem. `fracao` é quanto da altura fica acima do zero.
 */
function ColunaDivergente({
  label,
  barras,
  fracao,
  mostrarValores,
}: {
  label: string;
  barras: Barra[];
  fracao: number;
  /** Com duas barras por mês não cabe o valor em cima de cada uma. */
  mostrarValores: boolean;
}) {
  const alturaUtil = ALTURA_GRAFICO - ESPACO_ROTULO * 2;
  const acima = alturaUtil * fracao;
  const abaixo = alturaUtil - acima;
  return (
    <View style={styles.barColumn}>
      <View style={[styles.faixa, { height: acima + ESPACO_ROTULO, justifyContent: 'flex-end' }]}>
        <View style={styles.barRow}>
          {barras.map((b, i) => (
            <View key={i} style={styles.barSlot}>
              {b.valor > 0 ? (
                <>
                  {mostrarValores ? <Text style={styles.barValueLabel}>{formatarValorCurto(b.valor)}</Text> : null}
                  <View style={[styles.bar, { backgroundColor: b.cor, height: Math.max((b.altura / 100) * acima, 3) }]} />
                </>
              ) : null}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.zeroTick} />
      <View style={[styles.faixa, { height: abaixo + ESPACO_ROTULO, justifyContent: 'flex-start' }]}>
        <View style={[styles.barRow, { alignItems: 'flex-start' }]}>
          {barras.map((b, i) => (
            <View key={i} style={[styles.barSlot, { justifyContent: 'flex-start' }]}>
              {b.valor < 0 ? (
                <>
                  <View style={[styles.bar, { backgroundColor: b.cor, height: Math.max((b.altura / 100) * abaixo, 3) }]} />
                  {mostrarValores ? <Text style={styles.barValueLabel}>{formatarValorCurto(b.valor)}</Text> : null}
                </>
              ) : null}
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

export function EmpresaGraficosScreen() {
  const [metrica, setMetrica] = useState<MetricaGrafico>('Vendas');
  const goBack = useAppGoBack('Home');
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [resumo, setResumo] = useState<FinanceiroResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro('');
    try {
      setResumo(await buscarResumoFinanceiro(empresaId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os gráficos.');
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const balanco = metrica === 'Lucro × Compras';
  const dados = useMemo(() => montarSerieMensal(resumo, metrica), [resumo, metrica]);
  const serieBalanco = useMemo(() => montarSerieBalanco(resumo), [resumo]);
  const indicadores = useMemo(() => calcularIndicadores(resumo), [resumo]);

  // Cada coluna do gráfico: uma barra (Vendas, Compras, Lucro) ou duas (lucro e compras).
  const colunas = useMemo(
    () =>
      balanco
        ? serieBalanco.map((m) => ({
            label: m.label,
            barras: [
              { valor: m.lucro, altura: m.alturaLucro, cor: m.lucro >= 0 ? COR_LUCRO : COR_NEGATIVO },
              { valor: m.compras, altura: m.alturaCompras, cor: COR_NEGATIVO },
            ],
          }))
        : dados.map((d) => ({
            label: d.label,
            barras: [
              {
                valor: d.valor,
                altura: d.alturaPercentual,
                cor: d.valor < 0 ? COR_NEGATIVO : metrica === 'Lucro' ? COR_LUCRO : COR_VENDAS,
              },
            ],
          })),
    [balanco, serieBalanco, dados, metrica],
  );
  const fracao = useMemo(
    () => calcularEscala(colunas.flatMap((c) => c.barras.map((b) => b.valor))).fracaoPositiva,
    [colunas],
  );
  const semDados = colunas.every((c) => c.barras.every((b) => b.valor === 0));

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackTitleHeader title="Gráficos da empresa" onBack={goBack} />

        <View style={styles.segmentedControl}>
          {METRICAS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.segmentButton, metrica === item && styles.segmentButtonSelected]}
              onPress={() => setMetrica(item)}
            >
              <Text
                style={[styles.segmentText, metrica === item && styles.segmentTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>{metrica} por mês</Text>
          {metrica === 'Compras' ? (
            <Text style={styles.chartHint}>Compras aparecem abaixo do zero: é o dinheiro que saiu.</Text>
          ) : null}
          {balanco ? (
            <View style={styles.legenda}>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, { backgroundColor: COR_LUCRO }]} />
                <Text style={styles.legendaTexto}>Lucro (acima do zero)</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, { backgroundColor: COR_NEGATIVO }]} />
                <Text style={styles.legendaTexto}>Compras (abaixo do zero)</Text>
              </View>
            </View>
          ) : null}

          {carregando && !resumo ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={COMPANY_COLORS.primary} />
            </View>
          ) : erro ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>{erro}</Text>
              <TouchableOpacity onPress={() => void carregar()}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : colunas.length === 0 || semDados ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>Ainda não há {metrica.toLowerCase()} registradas no período.</Text>
            </View>
          ) : (
            <View style={styles.chartArea}>
              {/* Linha do zero, na altura que separa positivos de negativos. */}
              <View
                pointerEvents="none"
                style={[
                  styles.zeroLine,
                  { top: ESPACO_ROTULO + (ALTURA_GRAFICO - ESPACO_ROTULO * 2) * fracao },
                ]}
              />
              {colunas.map((c, index) => (
                <ColunaDivergente
                  key={`${c.label}-${index}`}
                  label={c.label}
                  barras={c.barras}
                  fracao={fracao}
                  mostrarValores={!balanco}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Receita (vendas no período)</Text>
            <Text style={styles.metricValue}>{formatarPreco(indicadores.receita)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Ticket médio</Text>
            <Text style={styles.metricValue}>{formatarPreco(indicadores.ticketMedio)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Margem</Text>
            <Text style={styles.metricValue}>{indicadores.margemPercentual}%</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F0E6CC',
    marginTop: 8,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentButtonSelected: {
    backgroundColor: COMPANY_COLORS.primary,
  },
  segmentText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 12,
  },
  segmentTextSelected: {
    color: '#FFF',
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COMPANY_COLORS.primaryBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    marginBottom: 14,
  },
  chartHint: {
    fontSize: 12,
    color: '#888',
    marginTop: -8,
    marginBottom: 10,
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: -6,
    marginBottom: 10,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaCor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendaTexto: {
    fontSize: 12,
    color: '#555',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#B8B8B8',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  faixa: {
    width: '100%',
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 3,
    flex: 1,
  },
  barSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  zeroTick: {
    height: 0,
  },
  barValueLabel: {
    fontSize: 9,
    color: '#888',
    marginVertical: 2,
  },
  bar: {
    width: 16,
    borderRadius: 6,
  },
  stateBox: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  stateText: {
    color: '#666',
    textAlign: 'center',
  },
  retryText: {
    color: COMPANY_COLORS.primary,
    fontWeight: '700',
  },
  barLabel: {
    marginTop: 8,
    color: '#666',
    fontSize: 11,
  },
  summaryGrid: {
    marginTop: 18,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COMPANY_COLORS.primaryBorder,
  },
  metricLabel: {
    color: '#666',
    fontSize: 12,
  },
  metricValue: {
    marginTop: 6,
    color: '#222',
    fontWeight: '800',
    fontSize: 22,
  },
});
