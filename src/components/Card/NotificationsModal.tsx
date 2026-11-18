import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  Notificacao,
  iconeTipoNotificacao,
  labelTipoNotificacao,
  listarNotificacoes,
  perfilDasNotificacoes,
} from '../../services/notificacaoService';
import { useAuth } from '../../context/AuthContext';
import { formatarDataHora } from '../../utils/dateFormat';
import {
  contarNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  obterNotificacoesLidas,
} from '../../utils/notificacoesStorage';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  empresaId?: number;
  onUnreadChange?: (count: number) => void;
}

export function NotificationsModal({
  visible,
  onClose,
  empresaId,
  onUnreadChange,
}: NotificationsModalProps) {
  const navigation = useNavigation<any>();
  const { perfilUso } = useAuth();
  const perfil = perfilDasNotificacoes(perfilUso);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const atualizarNaoLidas = useCallback(
    async (lista: Notificacao[], lidasSet: Set<string>) => {
      const count = lista.filter((n) => !lidasSet.has(n.id)).length;
      onUnreadChange?.(count);
    },
    [onUnreadChange],
  );

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [lista, lidasSet] = await Promise.all([
        listarNotificacoes(empresaId, perfil),
        obterNotificacoesLidas(empresaId),
      ]);
      setNotificacoes(lista);
      setLidas(lidasSet);
      await atualizarNaoLidas(lista, lidasSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }, [atualizarNaoLidas, empresaId, perfil]);

  useEffect(() => {
    if (visible) carregar();
  }, [visible, carregar]);

  const handlePress = async (notificacao: Notificacao) => {
    if (!empresaId) return;

    await marcarComoLida(empresaId, notificacao.id);
    const nextLidas = new Set(lidas);
    nextLidas.add(notificacao.id);
    setLidas(nextLidas);
    await atualizarNaoLidas(notificacoes, nextLidas);

    onClose();

    if (notificacao.tipo === 'pedido') {
      // Fornecedor: abre os pedidos recebidos, onde ele avança as etapas.
      navigation.navigate('EmpresaVendas');
      return;
    }

    if (notificacao.tipo === 'compra') {
      // Abre o acompanhamento: é lá que o cliente toca em "Concluir entrega".
      if (notificacao.solicitacaoId) {
        navigation.navigate('PedidoAcompanhamento', {
          pedidoId: notificacao.solicitacaoId,
        });
        return;
      }

      navigation.navigate('Cart');
      return;
    }
    if (notificacao.tipo === 'sistema') {
      return;
    }
    if (notificacao.fornecedorId && notificacao.fornecedorNome) {
      navigation.navigate('StoreVitrine', {
        fornecedorId: notificacao.fornecedorId,
        fornecedorNome: notificacao.fornecedorNome,
      });
    }
  };

  const marcarTodas = async () => {
    if (!empresaId) return;
    const ids = notificacoes.map((n) => n.id);
    await marcarTodasComoLidas(empresaId, ids);
    const nextLidas = new Set(ids);
    setLidas(nextLidas);
    onUnreadChange?.(0);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Notificações</Text>
            {notificacoes.length > 0 ? (
              <TouchableOpacity onPress={marcarTodas}>
                <Text style={styles.markAll}>Marcar todas como lidas</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator color="#FFAD19" style={{ marginVertical: 24 }} />
          ) : error ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={carregar}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : notificacoes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>Nenhuma notificação no momento.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notificacoes.map((notificacao) => {
                const naoLida = !lidas.has(notificacao.id);
                const iconName = iconeTipoNotificacao(notificacao.tipo) as keyof typeof Ionicons.glyphMap;
                const iconBg =
                  notificacao.tipo === 'compra' || notificacao.tipo === 'pedido'
                    ? styles.iconCompra
                    : notificacao.tipo === 'promocao'
                      ? styles.iconPromocao
                      : notificacao.tipo === 'sistema'
                        ? styles.iconSistema
                        : styles.iconOferta;
                return (
                  <TouchableOpacity
                    key={notificacao.id}
                    style={[styles.item, naoLida && styles.itemUnread]}
                    onPress={() => handlePress(notificacao)}
                  >
                    <View style={[styles.iconWrap, iconBg]}>
                      <Ionicons name={iconName} size={20} color="#FFAD19" />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTipo}>{labelTipoNotificacao(notificacao.tipo)}</Text>
                        {naoLida ? <View style={styles.dot} /> : null}
                      </View>
                      <Text style={styles.itemTitulo}>{notificacao.titulo}</Text>
                      <Text style={styles.itemMsg} numberOfLines={2}>{notificacao.mensagem}</Text>
                      <Text style={styles.itemData}>{formatarDataHora(notificacao.criadoEm)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: 20,
    zIndex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  markAll: { fontSize: 12, color: '#FFAD19', fontWeight: '600' },
  list: { paddingHorizontal: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  itemUnread: {
    backgroundColor: '#FFF8E7',
    borderColor: '#FFAD19',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  iconCompra: { backgroundColor: '#E8F5E9' },
  iconPromocao: { backgroundColor: '#FFF3E0' },
  iconSistema: { backgroundColor: '#F3E5F5' },
  iconOferta: { backgroundColor: '#E3F2FD' },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  itemTipo: { fontSize: 11, fontWeight: '700', color: '#FFAD19', textTransform: 'uppercase' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D64545' },
  itemTitulo: { fontSize: 14, fontWeight: '700', color: '#333' },
  itemMsg: { fontSize: 12, color: '#666', marginTop: 2 },
  itemData: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyWrap: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { color: '#888', textAlign: 'center' },
  errorText: { color: '#D64545', textAlign: 'center' },
  retryText: { color: '#FFAD19', fontWeight: '600' },
  closeBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#FFAD19',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' },
});
