import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useAuth } from '../../context/AuthContext';
import { obterLogistica, type LogisticaResumo } from '../../services/logisticaService';
import { COMPANY_COLORS } from '../../theme/theme';
import { styles } from './logisticaStyles';

export function LogisticaScreen() {
  const goBack = useAppGoBack('Home');
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [resumo, setResumo] = useState<LogisticaResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro('');
    try {
      setResumo(await obterLogistica(empresaId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a logística.');
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const etapas = resumo?.etapas ?? [];
  const semEntrega = !resumo || resumo.vazio;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackTitleHeader title="Logística e envio" onBack={goBack} />

        {carregando && !resumo ? (
          <ActivityIndicator color={COMPANY_COLORS.primary} style={{ marginTop: 32 }} />
        ) : erro ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Não foi possível carregar</Text>
            <Text style={styles.heroSubtitle}>{erro}</Text>
            <TouchableOpacity onPress={() => void carregar()} style={{ marginTop: 12 }}>
              <Text style={styles.heroValue}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : semEntrega ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Status da entrega</Text>
            <Text style={styles.heroValue}>Nenhuma entrega</Text>
            <Text style={styles.heroSubtitle}>Quando houver um pedido em andamento, ele aparece aqui.</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Status da entrega</Text>
              <Text style={styles.heroValue}>{resumo.status ?? '—'}</Text>
              {resumo.tempoEstimado ? (
                <Text style={styles.heroSubtitle}>Tempo estimado: {resumo.tempoEstimado}</Text>
              ) : null}
            </View>

            {etapas.length > 0 ? (
              <View style={styles.timelineCard}>
                {etapas.map((etapa, index) => (
                  <View key={`${etapa.nome}-${index}`} style={styles.stepRow}>
                    <View style={styles.stepMarkerWrap}>
                      <View style={[styles.stepMarker, etapa.concluido ? styles.stepMarkerDone : styles.stepMarkerPending]} />
                      {index < etapas.length - 1 ? <View style={styles.stepLine} /> : null}
                    </View>

                    <View style={styles.stepContent}>
                      <Text style={styles.stepName}>{etapa.nome}</Text>
                      <Text style={styles.stepTime}>{etapa.horario}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.summaryGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pedido</Text>
                <Text style={styles.metricValue}>{resumo.pedido ?? '—'}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Motorista</Text>
                <Text style={styles.metricValue}>{resumo.motorista ?? '—'}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Rota</Text>
                <Text style={styles.metricValue}>{resumo.rota ?? '—'}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
