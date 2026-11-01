import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useAuth } from '../../context/AuthContext';
import { listarCaminhoneiros, type Caminhoneiro } from '../../services/logisticaService';
import { COMPANY_COLORS } from '../../theme/theme';
import { styles } from './camioneirosStyles';

export function CamioneirosScreen() {
  const navigation = useNavigation<any>();
  const goBack = useAppGoBack('Home');
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [motoristas, setMotoristas] = useState<Caminhoneiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro('');
    try {
      setMotoristas(await listarCaminhoneiros(empresaId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os caminhoneiros.');
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  // Recarrega ao voltar do cadastro.
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackTitleHeader
          title="Caminhoneiros"
          onBack={goBack}
          rightSlot={
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('CadastroCamioneiros')}
            >
              <Text style={styles.headerButtonText}>+ Novo</Text>
            </TouchableOpacity>
          }
        />

        <View style={styles.summary}>
          <Text style={styles.summaryValue}>{motoristas.length}</Text>
          <Text style={styles.summaryLabel}>
            {motoristas.length === 1 ? 'motorista cadastrado' : 'motoristas cadastrados'}
          </Text>
        </View>

        {carregando && motoristas.length === 0 ? (
          <ActivityIndicator color={COMPANY_COLORS.primary} style={{ marginTop: 24 }} />
        ) : erro ? (
          <View style={styles.card}>
            <Text style={styles.name}>Não foi possível carregar</Text>
            <Text style={styles.route}>{erro}</Text>
            <TouchableOpacity onPress={() => void carregar()} style={{ marginTop: 10 }}>
              <Text style={styles.clientLabel}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : motoristas.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.name}>Nenhum caminhoneiro cadastrado</Text>
            <Text style={styles.route}>Toque em "+ Novo" para cadastrar o primeiro.</Text>
          </View>
        ) : (
          motoristas.map((motorista) => (
            <View key={motorista.id} style={styles.card}>
              <View style={styles.headRow}>
                <View>
                  <Text style={styles.name}>{motorista.nome}</Text>
                  <Text style={styles.route}>Rota: {motorista.rota}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(motorista.status)]}>
                  <Text style={styles.statusText}>{motorista.status}</Text>
                </View>
              </View>

              <Text style={styles.vehicle}>Veículo: {motorista.veiculo}</Text>

              <Text style={styles.clientLabel}>Entregas:</Text>
              {motorista.clientes.length > 0 ? (
                motorista.clientes.map((cliente, index) => (
                  <Text key={`${motorista.id}-${index}`} style={styles.clientName}>• {cliente}</Text>
                ))
              ) : (
                <Text style={styles.clientName}>Sem entregas vinculadas.</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Em rota':
      return styles.statusEmRota;
    case 'Carregando':
      return styles.statusCarregando;
    case 'Disponível':
      return styles.statusDisponivel;
    case 'Atrasado':
      return styles.statusAtrasado;
    default:
      return styles.statusPadrao;
  }
}
