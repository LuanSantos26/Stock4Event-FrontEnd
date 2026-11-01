import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useAuth } from '../../context/AuthContext';
import {
  BANCOS_COMUNS,
  buscarDadosBancarios,
  salvarDadosBancarios,
} from '../../services/dadosBancariosService';
import type { TipoChaveRecebimento, TipoConta } from '../../types/dadosBancarios';
import { formatarCnpjInput, formatarCpfInput, normalizarDocumento } from '../../utils/pixUtils';
import { COMPANY_COLORS } from '../../theme/theme';
import { styles } from '../Configuracoes/styles';

const TIPOS_CHAVE: { id: TipoChaveRecebimento; label: string }[] = [
  { id: 'cnpj', label: 'CNPJ' },
  { id: 'cpf', label: 'CPF' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'aleatoria', label: 'Aleatória' },
];

function formatarDocumento(valor: string): string {
  const d = normalizarDocumento(valor);
  return d.length <= 11 ? formatarCpfInput(d) : formatarCnpjInput(d);
}

/** Conta onde o fornecedor recebe os pagamentos dos pedidos (boleto, Pix e repasse do cartão). */
export function DadosBancariosScreen() {
  const goBack = useAppGoBack('Configuracoes');
  const { user } = useAuth();
  const empresaId = user?.empresa?.id;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [bancoCodigo, setBancoCodigo] = useState('');
  const [bancoNome, setBancoNome] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState<TipoConta>('corrente');
  const [titular, setTitular] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoChave, setTipoChave] = useState<TipoChaveRecebimento>('cnpj');
  const [chavePix, setChavePix] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro('');
    try {
      const dados = await buscarDadosBancarios(empresaId);
      if (dados) {
        setBancoCodigo(dados.bancoCodigo);
        setBancoNome(dados.bancoNome);
        setAgencia(dados.agencia);
        setConta(dados.conta);
        setTipoConta(dados.tipoConta);
        setTitular(dados.titular);
        setDocumento(formatarDocumento(dados.documento));
        setTipoChave(dados.tipoChavePix ?? 'cnpj');
        setChavePix(dados.chavePix ?? '');
      } else {
        // Primeira vez: sugere a empresa como titular.
        setTitular(user?.empresa?.nome ?? '');
        setDocumento(user?.empresa?.cnpj ? formatarDocumento(user.empresa.cnpj) : '');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados bancários.');
    } finally {
      setCarregando(false);
    }
  }, [empresaId, user?.empresa?.nome, user?.empresa?.cnpj]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const escolherBanco = (codigo: string, nome: string) => {
    setBancoCodigo(codigo);
    setBancoNome(nome);
  };

  const salvar = async () => {
    if (!empresaId || salvando) return;
    setErro('');
    setSucesso('');
    if (!bancoCodigo.trim() || !bancoNome.trim() || !agencia.trim() || !conta.trim() || !titular.trim()) {
      setErro('Preencha banco, agência, conta e titular.');
      return;
    }
    const doc = normalizarDocumento(documento);
    if (doc.length !== 11 && doc.length !== 14) {
      setErro('Informe o CPF ou CNPJ do titular.');
      return;
    }
    setSalvando(true);
    try {
      await salvarDadosBancarios({
        empresaId,
        bancoCodigo: bancoCodigo.trim(),
        bancoNome: bancoNome.trim(),
        agencia: agencia.trim(),
        conta: conta.trim(),
        tipoConta,
        titular: titular.trim(),
        documento: doc,
        tipoChavePix: chavePix.trim() ? tipoChave : null,
        chavePix: chavePix.trim() || null,
      });
      setSucesso('Dados bancários salvos. Os clientes já veem esta conta ao pagar.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackTitleHeader title="Dados bancários" onBack={goBack} />

          {carregando ? (
            <ActivityIndicator color={COMPANY_COLORS.primary} style={{ marginTop: 32 }} />
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Conta de recebimento</Text>
                <Text style={styles.sectionSubtitle}>
                  Os pagamentos dos pedidos (boleto, Pix e cartão) são destinados a esta conta.
                </Text>

                <Text style={styles.label}>Banco</Text>
                <View style={local.chips}>
                  {BANCOS_COMUNS.map((b) => {
                    const ativo = b.codigo === bancoCodigo;
                    return (
                      <TouchableOpacity
                        key={b.codigo}
                        style={[local.chip, ativo && local.chipAtivo]}
                        onPress={() => escolherBanco(b.codigo, b.nome)}
                      >
                        <Text style={[local.chipTexto, ativo && local.chipTextoAtivo]}>{b.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={local.linha}>
                  <View style={{ width: 90 }}>
                    <Text style={styles.label}>Código</Text>
                    <TextInput
                      style={styles.input}
                      value={bancoCodigo}
                      onChangeText={(t) => setBancoCodigo(t.replace(/\D/g, '').slice(0, 3))}
                      placeholder="001"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Nome do banco</Text>
                    <TextInput style={styles.input} value={bancoNome} onChangeText={setBancoNome} placeholder="Banco do Brasil" />
                  </View>
                </View>

                <View style={local.linha}>
                  <View style={{ width: 120 }}>
                    <Text style={styles.label}>Agência</Text>
                    <TextInput
                      style={styles.input}
                      value={agencia}
                      onChangeText={(t) => setAgencia(t.replace(/[^\dXx-]/g, '').slice(0, 7))}
                      placeholder="1234"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Conta com dígito</Text>
                    <TextInput
                      style={styles.input}
                      value={conta}
                      onChangeText={(t) => setConta(t.replace(/[^\dXx-]/g, '').slice(0, 15))}
                      placeholder="12345-6"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Tipo de conta</Text>
                <View style={local.chips}>
                  {(['corrente', 'poupanca'] as TipoConta[]).map((t) => {
                    const ativo = t === tipoConta;
                    return (
                      <TouchableOpacity key={t} style={[local.chip, ativo && local.chipAtivo]} onPress={() => setTipoConta(t)}>
                        <Text style={[local.chipTexto, ativo && local.chipTextoAtivo]}>
                          {t === 'corrente' ? 'Corrente' : 'Poupança'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Titular</Text>
                <TextInput style={styles.input} value={titular} onChangeText={setTitular} placeholder="Nome ou razão social" />

                <Text style={styles.label}>CPF ou CNPJ do titular</Text>
                <TextInput
                  style={styles.input}
                  value={documento}
                  onChangeText={(t) => setDocumento(formatarDocumento(t))}
                  placeholder="00.000.000/0000-00"
                  keyboardType="number-pad"
                  maxLength={18}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Chave Pix</Text>
                <Text style={styles.sectionSubtitle}>Opcional. Sem ela, o cliente não consegue pagar por Pix.</Text>
                <View style={local.chips}>
                  {TIPOS_CHAVE.map((t) => {
                    const ativo = t.id === tipoChave;
                    return (
                      <TouchableOpacity key={t.id} style={[local.chip, ativo && local.chipAtivo]} onPress={() => setTipoChave(t.id)}>
                        <Text style={[local.chipTexto, ativo && local.chipTextoAtivo]}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  value={chavePix}
                  onChangeText={setChavePix}
                  placeholder="Sua chave Pix"
                  autoCapitalize="none"
                  keyboardType={tipoChave === 'email' ? 'email-address' : tipoChave === 'aleatoria' ? 'default' : 'phone-pad'}
                />
              </View>

              {erro ? <Text style={styles.errorText}>{erro}</Text> : null}
              {sucesso ? <Text style={styles.successText}>{sucesso}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, salvando && styles.saveButtonDisabled]}
                onPress={() => void salvar()}
                disabled={salvando}
              >
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Salvar dados bancários</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const local = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COMPANY_COLORS.primaryBorder,
    backgroundColor: '#FFF',
  },
  chipAtivo: {
    backgroundColor: COMPANY_COLORS.primary,
    borderColor: COMPANY_COLORS.primary,
  },
  chipTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: COMPANY_COLORS.primary,
  },
  chipTextoAtivo: {
    color: '#FFF',
  },
  linha: {
    flexDirection: 'row',
    gap: 10,
  },
});
