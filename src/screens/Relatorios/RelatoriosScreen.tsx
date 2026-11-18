import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAuth } from '../../context/AuthContext';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { COMPANY_COLORS } from '../../theme/theme';
import {
  PerfilRelatorio,
  PeriodoRelatorio,
  Relatorio,
  buscarRelatorio,
} from '../../services/relatorioService';
import {
  dataISO,
  dataHoraCurta,
  deslocarData,
  ehPeriodoAtualOuFuturo,
  gerarCsvRelatorio,
  gerarHtmlRelatorio,
  moeda,
  nomeArquivo,
  rotuloPeriodo,
} from '../../utils/relatorio';
import { baixarCsv, baixarPdf } from '../../utils/relatorioDownload';

const PERIODOS: { key: PeriodoRelatorio; label: string }[] = [
  { key: 'dia', label: 'Dia' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
];

/** Relatório de vendas (fornecedor) ou de compras (cliente) por dia, mês ou ano, para baixar. */
export function RelatoriosScreen() {
  const { user, perfilUso } = useAuth();
  const perfil: PerfilRelatorio = perfilUso === 'Fornecedor' ? 'fornecedor' : 'cliente';
  const fornecedor = perfil === 'fornecedor';
  const goBack = useAppGoBack(fornecedor ? 'EmpresaVendas' : 'Pedidos');
  const cor = fornecedor ? COMPANY_COLORS.primary : '#C98912';
  const empresaId = user?.empresa?.id;

  const [periodo, setPeriodo] = useState<PeriodoRelatorio>('mes');
  const [data, setData] = useState(() => new Date());
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [baixando, setBaixando] = useState<'pdf' | 'csv' | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setErro('');
    try {
      setRelatorio(await buscarRelatorio(empresaId, perfil, periodo, dataISO(data)));
    } catch (err) {
      setRelatorio(null);
      setErro(err instanceof Error ? err.message : 'Erro ao gerar o relatório.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, perfil, periodo, data]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const trocarPeriodo = (novo: PeriodoRelatorio) => {
    setPeriodo(novo);
    setData(new Date()); // cada período começa no atual: hoje, este mês, este ano
    setAviso('');
  };

  const baixar = async (tipo: 'pdf' | 'csv') => {
    if (!relatorio || baixando) return;
    setBaixando(tipo);
    setAviso('');
    try {
      if (tipo === 'pdf') {
        await baixarPdf(gerarHtmlRelatorio(relatorio));
      } else {
        await baixarCsv(gerarCsvRelatorio(relatorio), nomeArquivo(relatorio, 'csv'));
      }
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Não foi possível baixar o relatório.');
    } finally {
      setBaixando(null);
    }
  };

  const noFim = ehPeriodoAtualOuFuturo(data, periodo);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackTitleHeader title={fornecedor ? 'Relatório de vendas' : 'Relatório de compras'} onBack={goBack} />

        <View style={styles.segment}>
          {PERIODOS.map((p) => {
            const ativo = p.key === periodo;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.segmentItem, ativo && { backgroundColor: cor }]}
                onPress={() => trocarPeriodo(p.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentText, ativo && styles.segmentTextAtivo]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navegador}>
          <TouchableOpacity style={styles.navBotao} onPress={() => setData(deslocarData(data, periodo, -1))}>
            <Ionicons name="chevron-back" size={20} color={cor} />
          </TouchableOpacity>
          <Text style={styles.navTexto}>{rotuloPeriodo(data, periodo)}</Text>
          <TouchableOpacity
            style={[styles.navBotao, noFim && styles.navBotaoOff]}
            onPress={() => setData(deslocarData(data, periodo, 1))}
            disabled={noFim}
          >
            <Ionicons name="chevron-forward" size={20} color={noFim ? '#C7CDD6' : cor} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={cor} />
        ) : erro ? (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity onPress={carregar}>
              <Text style={[styles.link, { color: cor }]}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : relatorio ? (
          <>
            <View style={styles.cards}>
              <Card label="Pedidos" valor={String(relatorio.totalPedidos)} cor={cor} />
              <Card label={fornecedor ? 'Faturamento' : 'Total gasto'} valor={moeda(relatorio.valorTotal)} cor={cor} />
              <Card label="Ticket médio" valor={moeda(relatorio.ticketMedio)} cor={cor} />
              <Card label="Concluídos" valor={`${relatorio.concluidos} de ${relatorio.totalPedidos - relatorio.cancelados}`} cor={cor} />
            </View>
            <Text style={styles.nota}>
              {relatorio.emAndamento} em andamento · {relatorio.cancelados} cancelado(s), fora dos valores
            </Text>

            <View style={styles.acoes}>
              <TouchableOpacity
                style={[styles.botao, { backgroundColor: cor }]}
                onPress={() => baixar('pdf')}
                disabled={!!baixando}
              >
                {baixando === 'pdf' ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color="#FFF" />
                    <Text style={styles.botaoTexto}>Baixar PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botao, styles.botaoClaro, { borderColor: cor }]}
                onPress={() => baixar('csv')}
                disabled={!!baixando}
              >
                {baixando === 'csv' ? <ActivityIndicator color={cor} /> : (
                  <>
                    <Ionicons name="grid-outline" size={18} color={cor} />
                    <Text style={[styles.botaoTexto, { color: cor }]}>Planilha (CSV)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {aviso ? <Text style={styles.erroTexto}>{aviso}</Text> : null}

            <Text style={styles.secao}>Produtos mais {fornecedor ? 'vendidos' : 'comprados'}</Text>
            {relatorio.produtos.length === 0 ? (
              <Text style={styles.vazio}>Nenhum produto no período.</Text>
            ) : (
              relatorio.produtos.slice(0, 5).map((p) => (
                <View key={p.nome} style={styles.linha}>
                  <Text style={styles.linhaNome} numberOfLines={1}>{p.nome}</Text>
                  <Text style={styles.linhaMeta}>{p.unidades.toLocaleString('pt-BR')} un.</Text>
                  <Text style={styles.linhaValor}>{moeda(p.valor)}</Text>
                </View>
              ))
            )}

            <Text style={styles.secao}>Pedidos do período</Text>
            {relatorio.pedidos.length === 0 ? (
              <Text style={styles.vazio}>Nenhum pedido no período.</Text>
            ) : (
              relatorio.pedidos.slice(0, 30).map((p) => (
                <View key={p.id} style={styles.linha}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linhaNome} numberOfLines={1}>#{p.id} · {p.contraparte}</Text>
                    <Text style={styles.linhaMeta}>{dataHoraCurta(p.criadoEm)} · {p.statusLabel}</Text>
                  </View>
                  <Text style={[styles.linhaValor, p.status === 'cancelada' && styles.cancelado]}>{moeda(p.valor)}</Text>
                </View>
              ))
            )}
            {relatorio.pedidos.length > 30 ? (
              <Text style={styles.nota}>Mostrando 30 de {relatorio.pedidos.length}. O PDF e a planilha trazem todos.</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Card({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValor, { color: cor }]} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COMPANY_COLORS.pageBackground },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COMPANY_COLORS.primaryBorder,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentText: { fontWeight: '700', color: COMPANY_COLORS.primaryMuted },
  segmentTextAtivo: { color: '#FFF' },
  navegador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  navBotao: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navBotaoOff: { opacity: 0.6 },
  navTexto: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  card: { width: '48%', flexGrow: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12 },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  cardValor: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  nota: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botao: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  botaoClaro: { backgroundColor: '#FFF', borderWidth: 1 },
  botaoTexto: { color: '#FFF', fontWeight: '700' },
  secao: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 22, marginBottom: 8 },
  vazio: { color: '#9CA3AF', fontSize: 13 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  linhaNome: { flex: 1, fontWeight: '600', color: '#1F2937' },
  linhaMeta: { fontSize: 12, color: '#6B7280' },
  linhaValor: { fontWeight: '700', color: '#1F2937' },
  cancelado: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  erroBox: { marginTop: 24, alignItems: 'center', gap: 8 },
  erroTexto: { color: '#C62828', textAlign: 'center', marginTop: 8 },
  link: { fontWeight: '700' },
});
