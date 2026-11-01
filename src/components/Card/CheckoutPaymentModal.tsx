import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
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
import { iconeTipoPagamento } from '../../services/formaPagamentoService';
import {
  DadosBancarios,
  buscarDadosBancarios,
  documentoMascarado,
  resumoConta,
} from '../../services/dadosBancariosService';
import {
  formatarData,
  gerarBoleto,
  gerarPixCopiaECola,
  vencimentoPadrao,
} from '../../utils/pagamentoSimulado';
import { CartaoFormModal } from './CartaoFormModal';

/** Dados de pagamento de um pedido (um pedido por fornecedor). */
export interface PagamentoFornecedor {
  pagamentoReferencia?: string;
  pagamentoDetalhes?: string;
}

export interface CheckoutPaymentResult {
  metodoPagamento: MetodoPagamento;
  pagamentoReferencia?: string;
  pagamentoDetalhes?: string;
  /** Referência específica de cada fornecedor (linha do boleto, Pix copia e cola). */
  porFornecedor?: Record<number, PagamentoFornecedor>;
}

/** Quem recebe e quanto: um item por fornecedor do carrinho (subtotal + entrega). */
export interface RecebedorCheckout {
  fornecedorId: number;
  fornecedorNome: string;
  valor: number;
}

interface CheckoutPaymentModalProps {
  visible: boolean;
  total: number;
  metodoInicial: MetodoPagamento;
  empresaId: number;
  /** Mantido por compatibilidade; o Pix agora usa a chave do fornecedor. */
  cnpjEmpresa?: string;
  enderecoResumo?: string;
  recebedores?: RecebedorCheckout[];
  onClose: () => void;
  onConfirm: (result: CheckoutPaymentResult) => void;
}

type OpcaoCheckout = 'pix' | 'cartao' | 'boleto';

const OPCOES: { id: OpcaoCheckout; label: string; icone: MetodoPagamento }[] = [
  { id: 'pix', label: 'Pix', icone: 'pix' },
  { id: 'cartao', label: 'Cartão', icone: 'credito' },
  { id: 'boleto', label: 'Boleto', icone: 'boleto' },
];

function opcaoDoMetodo(metodo: MetodoPagamento): OpcaoCheckout {
  if (metodo === 'boleto') return 'boleto';
  if (metodo === 'credito' || metodo === 'debito') return 'cartao';
  return 'pix';
}

/** Mesmo número para o mesmo fornecedor e valor durante a sessão do modal. */
function nossoNumero(fornecedorId: number, sessao: number): string {
  return `${sessao}${String(fornecedorId).padStart(4, '0')}`;
}

export function CheckoutPaymentModal({
  visible,
  total,
  metodoInicial,
  empresaId,
  enderecoResumo,
  recebedores = [],
  onClose,
  onConfirm,
}: CheckoutPaymentModalProps) {
  const [opcao, setOpcao] = useState<OpcaoCheckout>(opcaoDoMetodo(metodoInicial));
  const [tipoCartao, setTipoCartao] = useState<'credito' | 'debito'>(
    metodoInicial === 'debito' ? 'debito' : 'credito',
  );
  const [cartoes, setCartoes] = useState<CartaoSalvo[]>([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoSalvo | null>(null);
  const [contas, setContas] = useState<Record<number, DadosBancarios | null>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [falhouCarregar, setFalhouCarregar] = useState(false);
  const [cartaoFormVisible, setCartaoFormVisible] = useState(false);
  const [sessao, setSessao] = useState(() => Date.now() % 100000);

  const idsRecebedores = recebedores.map((r) => r.fornecedorId).join(',');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    setFalhouCarregar(false);
    try {
      const pares = await Promise.all(
        recebedores.map(async (r) => [r.fornecedorId, await buscarDadosBancarios(r.fornecedorId)] as const),
      );
      setContas(Object.fromEntries(pares));
      if (opcao === 'cartao') {
        const lista = await listarCartoesPorTipo(empresaId, tipoCartao);
        setCartoes(lista);
        setCartaoSelecionado(lista[0] ?? null);
      }
    } catch (err) {
      setFalhouCarregar(true);
      setErro(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível carregar os dados de pagamento. Toque para tentar de novo.',
      );
    } finally {
      setLoading(false);
    }
    // idsRecebedores representa a lista de recebedores sem recriar a função a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, opcao, tipoCartao, idsRecebedores]);

  useEffect(() => {
    if (visible) {
      setOpcao(opcaoDoMetodo(metodoInicial));
      if (metodoInicial === 'debito') setTipoCartao('debito');
      setErro('');
      setSessao(Date.now() % 100000);
    }
  }, [visible, metodoInicial]);

  useEffect(() => {
    if (visible) {
      carregar();
    }
  }, [visible, carregar]);

  const vencimento = useMemo(() => vencimentoPadrao(), [sessao]);

  // Pix copia e cola e boleto de cada fornecedor (só para quem cadastrou a conta).
  const cobrancas = useMemo(
    () =>
      recebedores.map((r) => {
        const conta = contas[r.fornecedorId] ?? null;
        const id = nossoNumero(r.fornecedorId, sessao);
        const pix = conta?.chavePix
          ? gerarPixCopiaECola({
              chave: conta.chavePix,
              tipoChave: conta.tipoChavePix,
              nomeRecebedor: conta.titular,
              valor: r.valor,
              txid: `S4E${id}`,
            })
          : null;
        const boleto = conta
          ? gerarBoleto({
              bancoCodigo: conta.bancoCodigo,
              agencia: conta.agencia,
              conta: conta.conta,
              valor: r.valor,
              vencimento,
              nossoNumero: id,
            })
          : null;
        return { recebedor: r, conta, pix, boleto };
      }),
    [recebedores, contas, sessao, vencimento],
  );

  const handleConfirm = () => {
    setErro('');

    if (falhouCarregar) {
      setErro('Não deu para carregar os dados de pagamento. Tente de novo.');
      return;
    }

    if (opcao === 'cartao') {
      if (!cartaoSelecionado) {
        setErro(`Cadastre um cartão de ${tipoCartao === 'credito' ? 'crédito' : 'débito'}.`);
        return;
      }
      onConfirm({
        metodoPagamento: tipoCartao,
        pagamentoReferencia: formatarCartaoExibicao(cartaoSelecionado.ultimosDigitos),
        pagamentoDetalhes: `${labelCartao(cartaoSelecionado)} · ${cartaoSelecionado.titular}`,
      });
      return;
    }

    const semConta = cobrancas.filter((c) =>
      opcao === 'pix' ? !c.pix : !c.boleto,
    );
    if (semConta.length > 0) {
      const nomes = semConta.map((c) => c.recebedor.fornecedorNome).join(', ');
      setErro(
        opcao === 'pix'
          ? `${nomes} ainda não cadastrou chave Pix. Escolha cartão ou boleto.`
          : `${nomes} ainda não cadastrou dados bancários. Escolha cartão ou Pix.`,
      );
      return;
    }

    const porFornecedor: Record<number, PagamentoFornecedor> = {};
    for (const c of cobrancas) {
      porFornecedor[c.recebedor.fornecedorId] =
        opcao === 'pix'
          ? {
              pagamentoReferencia: `PIX ${c.conta?.chavePix ?? ''}`.trim(),
              pagamentoDetalhes: `Pix copia e cola: ${c.pix}`,
            }
          : {
              pagamentoReferencia: c.boleto?.linhaDigitavel,
              pagamentoDetalhes: `Boleto ${c.conta?.bancoNome} · vence ${formatarData(vencimento)}`,
            };
    }
    onConfirm({ metodoPagamento: opcao, porFornecedor });
  };

  const renderConta = (conta: DadosBancarios | null) =>
    conta ? (
      <>
        <Text style={styles.contaLinha}>{resumoConta(conta)}</Text>
        <Text style={styles.contaLinha}>
          Titular: {conta.titular} · {documentoMascarado(conta.documento)}
        </Text>
      </>
    ) : (
      <Text style={styles.semConta}>Fornecedor ainda não cadastrou dados bancários.</Text>
    );

  return (
    <>
      <Modal visible={visible && !cartaoFormVisible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Como você quer pagar?</Text>
            <Text style={styles.total}>{formatarPreco(total)}</Text>

            {enderecoResumo ? (
              <View style={styles.enderecoBox}>
                <Ionicons name="location-outline" size={16} color="#FFAD19" />
                <Text style={styles.enderecoText} numberOfLines={2}>
                  {enderecoResumo}
                </Text>
              </View>
            ) : null}

            <View style={styles.opcoesRow}>
              {OPCOES.map((item) => {
                const selected = opcao === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.metodoChip, styles.opcaoChip, selected && styles.metodoChipSelected]}
                    onPress={() => setOpcao(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons
                      name={iconeTipoPagamento(item.icone)}
                      size={16}
                      color={selected ? '#FFF' : '#FFAD19'}
                    />
                    <Text style={[styles.metodoChipText, selected && styles.metodoChipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={styles.corpo} contentContainerStyle={{ paddingBottom: 4 }}>
              {loading ? (
                <ActivityIndicator color="#FFAD19" style={{ marginVertical: 20 }} />
              ) : opcao === 'cartao' ? (
                <View style={styles.panel}>
                  <View style={styles.tipoCartaoRow}>
                    {(['credito', 'debito'] as const).map((tipo) => {
                      const selected = tipoCartao === tipo;
                      return (
                        <TouchableOpacity
                          key={tipo}
                          style={[styles.tipoCartaoBtn, selected && styles.tipoCartaoBtnSelected]}
                          onPress={() => setTipoCartao(tipo)}
                        >
                          <Text style={[styles.tipoCartaoText, selected && styles.tipoCartaoTextSelected]}>
                            {tipo === 'credito' ? 'Crédito' : 'Débito'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {cartoes.length === 0 ? (
                    <TouchableOpacity style={styles.addCardBtn} onPress={() => setCartaoFormVisible(true)}>
                      <Ionicons name="add-circle-outline" size={20} color="#FFAD19" />
                      <Text style={styles.addCardText}>
                        Cadastrar cartão de {tipoCartao === 'credito' ? 'crédito' : 'débito'}
                      </Text>
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
                  {cobrancas.map((c) => (
                    <View key={c.recebedor.fornecedorId} style={styles.recebedorCard}>
                      <View style={styles.recebedorHead}>
                        <Text style={styles.recebedorNome}>{c.recebedor.fornecedorNome}</Text>
                        <Text style={styles.recebedorValor}>{formatarPreco(c.recebedor.valor)}</Text>
                      </View>
                      <Text style={styles.contaRotulo}>Repasse para a conta:</Text>
                      {renderConta(c.conta)}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.panel}>
                  {cobrancas.map((c) => (
                    <View key={c.recebedor.fornecedorId} style={styles.recebedorCard}>
                      <View style={styles.recebedorHead}>
                        <Text style={styles.recebedorNome}>{c.recebedor.fornecedorNome}</Text>
                        <Text style={styles.recebedorValor}>{formatarPreco(c.recebedor.valor)}</Text>
                      </View>
                      {opcao === 'pix' ? (
                        c.pix ? (
                          <>
                            <Text style={styles.contaRotulo}>Chave Pix: {c.conta?.chavePix}</Text>
                            <Text style={styles.contaLinha}>Recebedor: {c.conta?.titular}</Text>
                            <Text style={styles.contaRotulo}>Pix copia e cola</Text>
                            <View style={styles.codigoBox}>
                              <Text selectable style={styles.codigoTexto}>{c.pix}</Text>
                            </View>
                            <Text style={styles.codigoDica}>Toque e segure o código para copiar.</Text>
                          </>
                        ) : (
                          <Text style={styles.semConta}>Fornecedor ainda não cadastrou chave Pix.</Text>
                        )
                      ) : c.boleto ? (
                        <>
                          <Text style={styles.contaRotulo}>Beneficiário</Text>
                          {renderConta(c.conta)}
                          <Text style={styles.contaRotulo}>Linha digitável · vence {formatarData(vencimento)}</Text>
                          <View style={styles.codigoBox}>
                            <Text selectable style={styles.codigoTexto}>{c.boleto.linhaDigitavel}</Text>
                          </View>
                          <Text style={styles.codigoDica}>Toque e segure para copiar e pagar no app do banco.</Text>
                        </>
                      ) : (
                        <Text style={styles.semConta}>Fornecedor ainda não cadastrou dados bancários.</Text>
                      )}
                    </View>
                  ))}
                  <Text style={styles.avisoDemo}>
                    Pagamento de demonstração: nenhum valor é cobrado de verdade.
                  </Text>
                </View>
              )}
            </ScrollView>

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
                <Text style={styles.confirmText}>
                  {opcao === 'cartao' ? 'Pagar e pedir' : opcao === 'pix' ? 'Já paguei, pedir' : 'Gerar boleto e pedir'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CartaoFormModal
        visible={cartaoFormVisible}
        empresaId={empresaId}
        tipo={tipoCartao}
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
  opcoesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  opcaoChip: {
    flex: 1,
    justifyContent: 'center',
  },
  corpo: {
    flexGrow: 0,
    maxHeight: 360,
  },
  tipoCartaoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tipoCartaoBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  tipoCartaoBtnSelected: {
    borderColor: '#FFAD19',
    backgroundColor: '#FFF8E7',
  },
  tipoCartaoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tipoCartaoTextSelected: {
    color: '#B87800',
  },
  recebedorCard: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  recebedorHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recebedorNome: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },
  recebedorValor: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B87800',
  },
  contaRotulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    marginTop: 6,
  },
  contaLinha: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  semConta: {
    fontSize: 12,
    color: '#B3261E',
    marginTop: 4,
  },
  codigoBox: {
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  codigoTexto: {
    fontSize: 12,
    color: '#222',
    fontFamily: 'monospace',
  },
  codigoDica: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  avisoDemo: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
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
