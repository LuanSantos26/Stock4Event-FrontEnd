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
  calcularIndicadores,
  formatarValorCurto,
  montarSerieMensal,
  type MetricaGrafico,
} from '../../utils/graficosFinanceiro';

const METRICAS: MetricaGrafico[] = ['Vendas', 'Compras', 'Lucro'];

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

  const dados = useMemo(() => montarSerieMensal(resumo, metrica), [resumo, metrica]);
  const indicadores = useMemo(() => calcularIndicadores(resumo), [resumo]);
  const semDados = dados.every((item) => item.valor === 0);

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
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>{metrica} por mês</Text>

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
          ) : dados.length === 0 || semDados ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>Ainda não há {metrica.toLowerCase()} registradas no período.</Text>
            </View>
          ) : (
            <View style={styles.chartArea}>
              {dados.map((item, index) => (
                <View key={`${item.label}-${index}`} style={styles.barColumn}>
                  <View style={styles.barValueLabelWrap}>
                    <Text style={styles.barValueLabel}>{formatarValorCurto(item.valor)}</Text>
                  </View>
                  <View
                    style={[
                      styles.bar,
                      item.valor < 0 && styles.barNegativa,
                      { height: `${Math.max(item.alturaPercentual, 4)}%` },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
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
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentButtonSelected: {
    backgroundColor: COMPANY_COLORS.primary,
  },
  segmentText: {
    color: '#666',
    fontWeight: '700',
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
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 220,
    borderTopWidth: 1,
    borderTopColor: COMPANY_COLORS.primaryBorder,
    paddingTop: 12,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValueLabelWrap: {
    height: 24,
    justifyContent: 'center',
  },
  barValueLabel: {
    fontSize: 10,
    color: '#888',
  },
  bar: {
    width: 22,
    maxWidth: 32,
    backgroundColor: COMPANY_COLORS.primary,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  barNegativa: {
    backgroundColor: '#C0392B',
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
