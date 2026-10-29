import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MetodoPagamento } from '../../services/marketplaceService';
import { formatarPreco } from '../../services/productService';
import {
  CartaoSalvo,
  labelCartao,
  listarCartoesPorTipo,
} from '../../services/cartaoPagamentoService';
import { formatarCartaoExibicao } from '../../utils/cartaoUtils';
import {
  PixSalvo,
  garantirChaveCnpjInicial,
} from '../../services/pixChaveService';
import { labelTipoPagamento, iconeTipoPagamento } from '../../services/formaPagamentoService';
import { CartaoFormModal } from './CartaoFormModal';

export interface CheckoutPaymentResult {
  metodoPagamento: MetodoPagamento;
  pagamentoReferencia?: string;
  pagamentoDetalhes?: string;
}

interface CheckoutPaymentModalProps {
  visible: boolean;
  total: number;
  metodoInicial: MetodoPagamento;
  empresaId: number;
  cnpjEmpresa?: string;
  enderecoResumo?: string;
  onClose: () => void;
  onConfirm: (result: CheckoutPaymentResult) => void;
}

const METODOS: MetodoPagamento[] = ['pix', 'credito', 'debito', 'dinheiro'];

const PIX_QR_CODE = require('../../../assets/pix-qrcode.png');

function PixQrCode() {
  return (
    <View style={styles.qrWrap}>
      <View style={styles.qrBox}>
        <Image
          source={PIX_QR_CODE}
          style={styles.qrImage}
          resizeMode="contain"
          accessibilityLabel="QR Code PIX para pagamento"
        />
      </View>
      <Text style={styles.qrHint}>Escaneie o QR Code para pagar via PIX</Text>
    </View>
  );
}

export function CheckoutPaymentModal({
  visible,
  total,
  metodoInicial,
  empresaId,
  cnpjEmpresa,
  enderecoResumo,
  onClose,
  onConfirm,
}: CheckoutPaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPagamento>(metodoInicial);
  const [cartoes, setCartoes] = useState<CartaoSalvo[]>([]);
  const [chavesPix, setChavesPix] = useState<PixSalvo[]>([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoSalvo | null>(null);
  const [pixSelecionado, setPixSelecionado] = useState<PixSalvo | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cartaoFormVisible, setCartaoFormVisible] = useState(false);

  const [falhouCarregar, setFalhouCarregar] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    setFalhouCarregar(false);
    try {
      if (metodo === 'pix') {
        const chaves = await garantirChaveCnpjInicial(empresaId, cnpjEmpresa);
        setChavesPix(chaves);
        setPixSelecionado(chaves[0] ?? null);
      } else if (metodo === 'credito' || metodo === 'debito') {
        const lista = await listarCartoesPorTipo(empresaId, metodo);
        setCartoes(lista);
        setCartaoSelecionado(lista[0] ?? null);
      }
    } catch (err) {
      // Sem isto, uma falha de rede deixava a lista vazia e o usuário via
      // "Cadastre uma chave PIX" mesmo tendo uma cadastrada.
      setFalhouCarregar(true);
      setErro(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível carregar suas formas de pagamento. Toque para tentar de novo.',
      );
    } finally {
      setLoading(false);
    }
  }, [empresaId, cnpjEmpresa, metodo]);

  useEffect(() => {
    if (visible) {
      setMetodo(metodoInicial);
      setErro('');
    }
  }, [visible, metodoInicial]);

  useEffect(() => {
    if (visible) {
      carregar();
    }
  }, [visible, metodo, carregar]);

  const handleConfirm = () => {
    setErro('');

    // Lista vazia por falha de rede não é o mesmo que não ter cadastro.
    if (falhouCarregar) {
      setErro('Não deu para conferir suas formas de pagamento. Tente de novo.');
      return;
    }

    if (metodo === 'pix') {
      if (!pixSelecionado) {
        setErro('Cadastre uma chave PIX em Formas de pagamento.');
        return;
      }
      onConfirm({
        metodoPagamento: 'pix',
        pagamentoReferencia: `PIX ${pixSelecionado.chaveMascarada}`,
        pagamentoDetalhes: `${pixSelecionado.apelido} (${pixSelecionado.tipoChave})`,
      });
      return;
    }

    if (metodo === 'credito' || metodo === 'debito') {
      if (!cartaoSelecionado) {
        setErro(`Cadastre um cartão de ${metodo === 'credito' ? 'crédito' : 'débito'}.`);
        return;
      }
      onConfirm({
        metodoPagamento: metodo,
        pagamentoReferencia: formatarCartaoExibicao(cartaoSelecionado.ultimosDigitos),
        pagamentoDetalhes: `${labelCartao(cartaoSelecionado)} · ${cartaoSelecionado.titular}`,
      });
      return;
    }

    onConfirm({
      metodoPagamento: 'dinheiro',
      pagamentoReferencia: 'Pagamento na entrega',
      pagamentoDetalhes: 'Dinheiro — conferir troco com entregador',
    });
  };

  return (
    <>
      <Modal visible={visible && !cartaoFormVisible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Confirmar pagamento</Text>
            <Text style={styles.total}>{formatarPreco(total)}</Text>

            {enderecoResumo ? (
              <View style={styles.enderecoBox}>
                <Ionicons name="location-outline" size={16} color="#FFAD19" />
                <Text style={styles.enderecoText} numberOfLines={2}>
                  {enderecoResumo}
                </Text>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metodoScroll}>
              {METODOS.map((item) => {
                const selected = metodo === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.metodoChip, selected && styles.metodoChipSelected]}
                    onPress={() => setMetodo(item)}
                  >
                    <Ionicons
                      name={iconeTipoPagamento(item)}
                      size={16}
                      color={selected ? '#FFF' : '#FFAD19'}
                    />
                    <Text style={[styles.metodoChipText, selected && styles.metodoChipTextSelected]}>
                      {labelTipoPagamento(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loading ? (
              <ActivityIndicator color="#FFAD19" style={{ marginVertical: 20 }} />
            ) : metodo === 'pix' ? (
              <View style={styles.panel}>
                <PixQrCode />
                {chavesPix.map((chave) => {
                  const selected = pixSelecionado?.id === chave.id;
                  return (
                    <TouchableOpacity
                      key={chave.id}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      onPress={() => setPixSelecionado(chave)}
                    >
                      <Ionicons name="phone-portrait-outline" size={18} color="#FFAD19" />
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>{chave.apelido}</Text>
                        <Text style={styles.optionSub}>{chave.chaveMascarada}</Text>
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={20} color="#FFAD19" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : metodo === 'credito' || metodo === 'debito' ? (
              <View style={styles.panel}>
                {cartoes.length === 0 ? (
                  <TouchableOpacity style={styles.addCardBtn} onPress={() => setCartaoFormVisible(true)}>
                    <Ionicons name="add-circle-outline" size={20} color="#FFAD19" />
                    <Text style={styles.addCardText}>Cadastrar cartão de {labelTipoPagamento(metodo).toLowerCase()}</Text>
                  </TouchableOpacity>
                ) : (
                  cartoes.map((cartao) => {
                    const selected = cartaoSelecionado?.id === cartao.id;
                    return (
                      <TouchableOpacity
                        key={cartao.id}
                        style={[styles.optionRow, selected && styles.optionRowSelected]}
                        onPress={() => setCartaoSelecionado(cartao)}
                      >
                        <Ionicons name="card-outline" size={18} color="#FFAD19" />
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionTitle}>{labelCartao(cartao)}</Text>
                          <Text style={styles.optionSub}>
                          {formatarCartaoExibicao(cartao.ultimosDigitos)} · {cartao.bandeira}
                        </Text>
                        </View>
                        {selected ? <Ionicons name="checkmark-circle" size={20} color="#FFAD19" /> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
                {cartoes.length > 0 ? (
                  <TouchableOpacity style={styles.linkBtn} onPress={() => setCartaoFormVisible(true)}>
                    <Text style={styles.linkBtnText}>+ Adicionar outro cartão</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.dinheiroText}>
                  O pagamento em dinheiro será confirmado na entrega. Tenha o valor exato ou informe se precisa de troco.
                </Text>
              </View>
            )}

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            {falhouCarregar && !loading ? (
              <TouchableOpacity onPress={carregar}>
                <Text style={styles.tentarNovamente}>Tocar para tentar de novo</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Confirmar e pedir</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CartaoFormModal
        visible={cartaoFormVisible}
        empresaId={empresaId}
        tipo={metodo === 'debito' ? 'debito' : 'credito'}
        onClose={() => setCartaoFormVisible(false)}
        onSaved={async () => {
          setCartaoFormVisible(false);
          await carregar();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  total: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFAD19',
    marginTop: 4,
    marginBottom: 12,
  },
  enderecoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  enderecoText: {
    flex: 1,
    fontSize: 12,
    color: '#444',
    lineHeight: 18,
  },
  metodoScroll: {
    marginBottom: 12,
  },
  metodoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFAD19',
    marginRight: 8,
    backgroundColor: '#FFF',
  },
  metodoChipSelected: {
    backgroundColor: '#FFAD19',
    borderColor: '#FFAD19',
  },
  metodoChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFAD19',
  },
  metodoChipTextSelected: {
    color: '#FFF',
  },
  panel: {
    marginBottom: 8,
  },
  qrWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrBox: {
    padding: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 8,
  },
  optionRowSelected: {
    borderColor: '#FFAD19',
    backgroundColor: '#FFF8E7',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  optionSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dinheiroText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    paddingVertical: 8,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFAD19',
    borderStyle: 'dashed',
  },
  addCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkBtnText: {
    color: '#FFAD19',
    fontWeight: '700',
    fontSize: 13,
  },
  erro: {
    color: '#C62828',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  tentarNovamente: {
    color: '#FFAD19',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '700',
    color: '#666',
  },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
  },
  confirmText: {
    fontWeight: '700',
    color: '#FFF',
  },
});
