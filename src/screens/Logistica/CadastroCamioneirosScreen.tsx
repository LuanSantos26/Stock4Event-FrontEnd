import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useAuth } from '../../context/AuthContext';
import {
  criarCaminhoneiro,
  listarCaminhoneiros,
  type Caminhoneiro,
} from '../../services/logisticaService';
import { COMPANY_COLORS } from '../../theme/theme';
import { styles } from './cadastroCamioneirosStyles';

export function CadastroCamioneirosScreen() {
  const goBack = useAppGoBack('Home');
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [motoristas, setMotoristas] = useState<Caminhoneiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [veiculo, setVeiculo] = useState('');
  const [rota, setRota] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    try {
      setMotoristas(await listarCaminhoneiros(empresaId));
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível carregar os caminhoneiros.');
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const totalEntregas = useMemo(
    () => motoristas.reduce((acc, item) => acc + item.entregas.length, 0),
    [motoristas],
  );

  const cadastrarMotorista = async () => {
    if (salvando || !empresaId) return;
    if (!nome.trim() || !veiculo.trim() || !rota.trim()) {
      Alert.alert('Atenção', 'Preencha nome, veículo e rota do caminhoneiro.');
      return;
    }

    setSalvando(true);
    try {
      const novo = await criarCaminhoneiro({
        empresaId,
        nome: nome.trim(),
        veiculo: veiculo.trim(),
        rota: rota.trim(),
        entrega: clienteNome.trim()
          ? { nomeCliente: clienteNome.trim(), cidade: clienteCidade.trim() || undefined }
          : undefined,
      });
      setMotoristas((prev) => [novo, ...prev.filter((m) => m.id !== novo.id)]);
      setNome('');
      setVeiculo('');
      setRota('');
      setClienteNome('');
      setClienteCidade('');
      Alert.alert('Sucesso', 'Caminhoneiro cadastrado com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar o caminhoneiro.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackTitleHeader title="Cadastro de caminhoneiros" onBack={goBack} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{motoristas.length}</Text>
          <Text style={styles.summaryLabel}>caminhoneiros cadastrados</Text>
          <Text style={styles.summarySub}>Total de entregas: {totalEntregas}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Dados do caminhoneiro</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome completo" />

          <Text style={styles.label}>Veículo</Text>
          <TextInput style={styles.input} value={veiculo} onChangeText={setVeiculo} placeholder="Ex: Truck 22" />

          <Text style={styles.label}>Rota atual</Text>
          <TextInput
            style={styles.input}
            value={rota}
            onChangeText={setRota}
            placeholder="Ex: São Paulo → Rio"
          />

          <Text style={styles.sectionTitle}>Entrega vinculada</Text>

          <Text style={styles.label}>Nome do cliente</Text>
          <TextInput
            style={styles.input}
            value={clienteNome}
            onChangeText={setClienteNome}
            placeholder="Ex: João da Padaria"
          />

          <Text style={styles.label}>Cidade</Text>
          <TextInput
            style={styles.input}
            value={clienteCidade}
            onChangeText={setClienteCidade}
            placeholder="Ex: Campinas"
          />

          <TouchableOpacity
            style={[styles.button, salvando ? { opacity: 0.6 } : null]}
            onPress={() => void cadastrarMotorista()}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Salvar caminhoneiro</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Caminhoneiros cadastrados</Text>

          {carregando && motoristas.length === 0 ? (
            <ActivityIndicator color={COMPANY_COLORS.primary} />
          ) : null}
          {!carregando && motoristas.length === 0 ? (
            <Text style={styles.semEntrega}>Nenhum caminhoneiro cadastrado ainda.</Text>
          ) : null}

          {motoristas.map((motorista) => (
            <View key={motorista.id} style={styles.motoristaCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.motoristaNome}>{motorista.nome}</Text>
                <Text style={styles.vehicleTag}>{motorista.veiculo}</Text>
              </View>

              <Text style={styles.rotaText}>Rota: {motorista.rota}</Text>

              {motorista.entregas.length > 0 ? (
                <View style={styles.entregasList}>
                  {motorista.entregas.map((entrega, index) => (
                    <View key={entrega.id ?? `${motorista.id}-${index}`} style={styles.entregaItem}>
                      <View style={styles.dot} />
                      <View style={styles.entregaInfo}>
                        <Text style={styles.entregaCliente}>{entrega.nomeCliente}</Text>
                        <Text style={styles.entregaMeta}>{entrega.cidade} • {entrega.rota}</Text>
                        <Text style={styles.entregaStatus}>{entrega.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.semEntrega}>Sem entregas vinculadas.</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
