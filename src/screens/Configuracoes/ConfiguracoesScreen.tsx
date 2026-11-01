import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../../components/Header/BackButton';
import { ScreenHeader } from '../../components/Header/ScreenHeader';
import { BottomTabBar, useBottomTabBarHeight } from '../../components/layout/BottomTabBar';
import { AlternarPerfilCard } from '../../components/Perfil/AlternarPerfilCard';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { useHeaderTopPadding } from '../../utils/safeArea';
import { atualizarEmpresa, atualizarUsuario } from '../../services/authService';
import { formatarCnpjInput, formatarTelefoneInput, normalizarDocumento } from '../../utils/pixUtils';
import { clienteStyles, styles } from './styles';
import { CLIENTE_COLORS, COMPANY_COLORS } from '../../theme/theme';
import { BrandLogo } from '../../components/brand/BrandLogo';

const PRIMARY = CLIENTE_COLORS.primary;

function IconField({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  maxLength,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={clienteStyles.field}>
      <Ionicons name={icon} size={18} color={PRIMARY} />
      <TextInput
        style={clienteStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA3B2"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
      />
    </View>
  );
}

export function ConfiguracoesScreen() {
  const { user, updateUser, perfilUso } = useAuth();
  const navigation = useNavigation<any>();
  const isCliente = perfilUso === 'Cliente';
  const goBack = useAppGoBack(isCliente ? 'Perfil' : 'Home');
  const topPadding = useHeaderTopPadding(8);
  const tabBarHeight = useBottomTabBarHeight();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [telefoneEmpresa, setTelefoneEmpresa] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setNome(user.nome ?? '');
    setEmail(user.email ?? '');
    setNomeEmpresa(user.empresa?.nome ?? '');
    setCnpjEmpresa(user.empresa?.cnpj ?? '');
    setTelefoneEmpresa(user.empresa?.telefone ?? '');
  }, [user]);

  const handleSalvar = async () => {
    setError('');
    setSuccess('');

    if (!user?.id || !user.empresa?.id) {
      setError('Usuário não identificado.');
      return;
    }

    const nomeTrim = nome.trim();
    const emailTrim = email.trim().toLowerCase();
    const nomeEmpresaTrim = nomeEmpresa.trim();
    const cnpjDigits = normalizarDocumento(cnpjEmpresa);

    if (!nomeTrim) {
      setError('Informe seu nome.');
      return;
    }
    if (!emailTrim) {
      setError('Informe seu e-mail.');
      return;
    }
    if (!nomeEmpresaTrim) {
      setError(isCliente ? 'Informe o nome do negócio.' : 'Informe o nome da empresa.');
      return;
    }
    if (cnpjDigits.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }

    if (senha || confirmarSenha) {
      if (senha.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (senha !== confirmarSenha) {
        setError('As senhas não coincidem.');
        return;
      }
    }

    setLoading(true);
    try {
      const payloadUsuario: { nome: string; email: string; senha?: string } = {
        nome: nomeTrim,
        email: emailTrim,
      };
      if (senha) payloadUsuario.senha = senha;

      const usuarioAtualizado = await atualizarUsuario(user.id, payloadUsuario);

      const empresaAtualizada = await atualizarEmpresa(user.empresa.id, {
        nome: nomeEmpresaTrim,
        cnpj: formatarCnpjInput(cnpjDigits),
        telefone: telefoneEmpresa.trim() || undefined,
      });

      await updateUser({
        ...usuarioAtualizado,
        empresa: {
          ...usuarioAtualizado.empresa,
          nome: empresaAtualizada.nome,
          cnpj: empresaAtualizada.cnpj,
          telefone: empresaAtualizada.telefone,
        },
      });

      setSenha('');
      setConfirmarSenha('');
      setSuccess('Configurações salvas com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  if (isCliente) {
    return (
      <View style={clienteStyles.root}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: tabBarHeight + 16 }}
        >
          <View style={[clienteStyles.header, { paddingTop: topPadding }]}>
            <View style={clienteStyles.headerTop}>
              <BackButton onPress={goBack} iconColor={PRIMARY} />
              <BrandLogo variant="azul" height={34} />
              <View style={{ width: 32 }} />
            </View>
            <Text style={clienteStyles.title}>Dados do cliente</Text>
          </View>

          <View style={clienteStyles.sheet}>
            <AlternarPerfilCard />
            <View style={clienteStyles.card}>
              <View style={clienteStyles.sectionHeader}>
                <View style={clienteStyles.sectionIcon}>
                  <Ionicons name="person-outline" size={18} color={PRIMARY} />
                </View>
                <View>
                  <Text style={clienteStyles.sectionTitle}>Dados pessoais</Text>
                  <Text style={clienteStyles.sectionSubtitle}>Nome e e-mail da conta</Text>
                </View>
              </View>
              <Text style={clienteStyles.label}>Nome</Text>
              <IconField
                icon="person-outline"
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                autoCapitalize="words"
              />
              <Text style={clienteStyles.label}>E-mail</Text>
              <IconField
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={clienteStyles.card}>
              <View style={clienteStyles.sectionHeader}>
                <View style={clienteStyles.sectionIcon}>
                  <Ionicons name="business-outline" size={18} color={PRIMARY} />
                </View>
                <View>
                  <Text style={clienteStyles.sectionTitle}>Dados do negócio</Text>
                  <Text style={clienteStyles.sectionSubtitle}>
                    Nome, CNPJ e informações da empresa
                  </Text>
                </View>
              </View>
              <Text style={clienteStyles.label}>Nome do negócio</Text>
              <IconField
                icon="storefront-outline"
                value={nomeEmpresa}
                onChangeText={setNomeEmpresa}
                placeholder="Nome do estabelecimento"
                autoCapitalize="words"
              />
              <Text style={clienteStyles.label}>CNPJ</Text>
              <IconField
                icon="document-text-outline"
                value={cnpjEmpresa}
                onChangeText={(text) => setCnpjEmpresa(formatarCnpjInput(text))}
                placeholder="00.000.000/0000-00"
                keyboardType="number-pad"
                maxLength={18}
              />
            </View>

            <View style={clienteStyles.card}>
              <View style={clienteStyles.sectionHeader}>
                <View style={clienteStyles.sectionIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={PRIMARY} />
                </View>
                <View>
                  <Text style={clienteStyles.sectionTitle}>Alterar senha</Text>
                  <Text style={clienteStyles.sectionSubtitle}>
                    Deixe em branco para manter a senha atual.
                  </Text>
                </View>
              </View>
              <Text style={clienteStyles.label}>Nova senha</Text>
              <IconField
                icon="lock-closed-outline"
                value={senha}
                onChangeText={setSenha}
                placeholder="Mínimo 6 caracteres"
                autoCapitalize="none"
                secureTextEntry
              />
              <Text style={clienteStyles.label}>Confirmar senha</Text>
              <IconField
                icon="lock-closed-outline"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                placeholder="Repita a nova senha"
                autoCapitalize="none"
                secureTextEntry
              />
            </View>

            {error ? <Text style={clienteStyles.errorText}>{error}</Text> : null}
            {success ? <Text style={clienteStyles.successText}>{success}</Text> : null}

            <TouchableOpacity
              style={[clienteStyles.saveButton, loading && clienteStyles.saveButtonDisabled]}
              onPress={handleSalvar}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={PRIMARY} />
              ) : (
                <Text style={clienteStyles.saveButtonText}>Salvar alterações</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <BottomTabBar activeRoute="Configuracoes" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.container} edges={['left', 'right']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Ajustes"
          subtitle="Dados da conta, senha e informações da empresa."
          inset={16}
          style={{ marginBottom: 16 }}
        />

        <AlternarPerfilCard />

        <TouchableOpacity
          style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
          onPress={() => navigation.navigate('DadosBancarios')}
          accessibilityRole="button"
        >
          <Ionicons name="business-outline" size={22} color={COMPANY_COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Dados bancários</Text>
            <Text style={styles.sectionSubtitle}>Conta e chave Pix onde você recebe os pagamentos dos pedidos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COMPANY_COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <Text style={styles.sectionSubtitle}>Nome e e-mail da conta</Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            autoCapitalize="words"
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alterar senha</Text>
          <Text style={styles.hint}>Deixe em branco para manter a senha atual.</Text>
          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            style={styles.input}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            placeholder="Repita a nova senha"
            secureTextEntry
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados da empresa</Text>
          <Text style={styles.sectionSubtitle}>Informações usadas nos pedidos</Text>
          <Text style={styles.label}>Nome da empresa</Text>
          <TextInput
            style={styles.input}
            value={nomeEmpresa}
            onChangeText={setNomeEmpresa}
            placeholder="Razão social ou nome fantasia"
            autoCapitalize="words"
          />

          <Text style={styles.label}>CNPJ</Text>
          <TextInput
            style={styles.input}
            value={cnpjEmpresa}
            onChangeText={(text) => setCnpjEmpresa(formatarCnpjInput(text))}
            placeholder="00.000.000/0000-00"
            keyboardType="number-pad"
            maxLength={18}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={telefoneEmpresa}
            onChangeText={(text) => setTelefoneEmpresa(formatarTelefoneInput(text))}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    <BottomTabBar activeRoute="Configuracoes" />
    </View>
  );
}
