import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { getImageUrl } from '../../../config/api';
import { NOME_PRODUTO_MAX, prepararImagemProduto } from '../../../utils/productImage';
import { COMPANY_COLORS } from '../../../theme/theme';
import {
  Produto,
  ProdutoPayload,
  atualizarProduto,
  criarProduto,
  formatarPreco,
  uploadImagemProduto,
} from '../../../services/productService';
import { codigoBarrasValido, normalizarCodigoBarras } from '../../../utils/codigoBarras';

interface ProductFormModalProps {
  visible: boolean;
  empresaId: number;
  produto?: Produto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({
  visible,
  empresaId,
  produto,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const isEditing = !!produto;

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [descricao, setDescricao] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | undefined>();
  const [localImageUri, setLocalImageUri] = useState<string | undefined>();
  const [localImageMime, setLocalImageMime] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    setNome(produto?.nome ?? '');
    setPreco(produto ? String(produto.precoVenda) : '');
    setEstoque(produto?.estoque != null ? String(produto.estoque) : '0');
    setUnidade(produto?.unidade ?? 'UN');
    setDescricao(produto?.descricao ?? '');
    setCodigoBarras(produto?.codigoBarras ?? '');
    setImagemUrl(produto?.imagemUrl);
    setLocalImageUri(undefined);
    setLocalImageMime('image/jpeg');
    setError('');
  }, [visible, produto]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar a galeria é necessária.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const preparada = await prepararImagemProduto(asset.uri);
        setLocalImageUri(preparada.uri);
        setLocalImageMime(preparada.mimeType);
        setImagemUrl(undefined);
        setError('');
      } catch {
        setError('Não foi possível processar a imagem. Tente outra foto.');
      }
    }
  };

  const handleSave = async () => {
    setError('');

    if (!nome.trim() || !preco.trim() || !unidade.trim()) {
      setError('Preencha nome, preço e unidade.');
      return;
    }

    if (nome.trim().length > NOME_PRODUTO_MAX) {
      setError(`Nome do produto deve ter no máximo ${NOME_PRODUTO_MAX} caracteres.`);
      return;
    }

    const precoNumero = Number(preco.replace(',', '.'));
    if (Number.isNaN(precoNumero) || precoNumero < 0) {
      setError('Informe um preço válido.');
      return;
    }

    const codigoLimpo = normalizarCodigoBarras(codigoBarras);
    if (codigoLimpo && !codigoBarrasValido(codigoLimpo)) {
      setError('Código de barras inválido. Confira os números (EAN-8, EAN-13, UPC ou GTIN-14).');
      return;
    }

    const estoqueNumero = Number(estoque.replace(',', '.'));
    if (Number.isNaN(estoqueNumero) || estoqueNumero < 0) {
      setError('Informe uma quantidade em estoque válida.');
      return;
    }

    setLoading(true);

    try {
      let resolvedImageUrl = imagemUrl;

      if (localImageUri) {
        resolvedImageUrl = await uploadImagemProduto(localImageUri, localImageMime);
      }

      const payload: ProdutoPayload = {
        nome: nome.trim(),
        precoVenda: precoNumero,
        unidade: unidade.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
        imagemUrl: resolvedImageUrl,
        estoque: Math.floor(estoqueNumero),
        codigoBarras: codigoLimpo || undefined,
        empresaId: Number(empresaId),
      };

      if (isEditing && produto) {
        await atualizarProduto(produto.id, payload);
      } else {
        await criarProduto(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar produto.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const previewUri = localImageUri ?? getImageUrl(imagemUrl);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Editar produto' : 'Novo produto'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Feather name="camera" size={32} color={COMPANY_COLORS.primary} />
                  <Text style={styles.imagePlaceholderText}>Escolher imagem</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome do produto"
              maxLength={NOME_PRODUTO_MAX}
            />
            {nome.length > NOME_PRODUTO_MAX - 30 ? (
              <Text style={styles.charHint}>
                {nome.length}/{NOME_PRODUTO_MAX} caracteres
              </Text>
            ) : null}

            <Text style={styles.label}>Preço de venda</Text>
            <TextInput
              style={styles.input}
              value={preco}
              onChangeText={setPreco}
              placeholder="0,00"
              keyboardType="decimal-pad"
            />
            {preco ? (
              <Text style={styles.priceHint}>
                {formatarPreco(Number(preco.replace(',', '.')) || 0)}
              </Text>
            ) : null}

            <Text style={styles.label}>Unidade</Text>
            <TextInput
              style={styles.input}
              value={unidade}
              onChangeText={setUnidade}
              placeholder="UN, CX, L..."
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Quantidade em estoque</Text>
            <TextInput
              style={styles.input}
              value={estoque}
              onChangeText={setEstoque}
              placeholder="0"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Código de barras (opcional)</Text>
            <TextInput
              style={styles.input}
              value={codigoBarras}
              onChangeText={(t) => setCodigoBarras(normalizarCodigoBarras(t).slice(0, 14))}
              placeholder="Ex.: 7891000100103"
              keyboardType="number-pad"
              maxLength={14}
            />
            <Text style={styles.charHint}>
              Leia com o leitor ou digite. Se deixar vazio, o sistema cria um código interno para o PDV.
            </Text>

            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descrição do produto"
              multiline
              numberOfLines={3}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Salvar alterações' : 'Cadastrar produto'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COMPANY_COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9EB',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceHint: {
    marginTop: -8,
    marginBottom: 12,
    color: COMPANY_COLORS.primary,
    fontWeight: '600',
  },
  charHint: {
    marginTop: -8,
    marginBottom: 12,
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
  },
  errorText: {
    color: '#D64545',
    textAlign: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: COMPANY_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
