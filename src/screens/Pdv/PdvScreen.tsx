import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../../components/Header/BackButton';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useAppGoBack } from '../../hooks/useAppGoBack';
import { formatarPreco } from '../../services/productService';
import { formatarQuantidade } from '../../services/barracaService';
import { CLIENTE_COLORS, COMPANY_COLORS } from '../../theme/theme';
import { TIPOS_DISPONIVEIS } from '../FormasPagamento/formasHelpers';
import { formatarCnpjInput, formatarCpfInput } from '../../utils/pixUtils';
import { formatarDataHora } from '../../utils/dateFormat';
import { useBottomInset, useHeaderTopPadding } from '../../utils/safeArea';
import { imprimirComprovante, labelFormaPagamento } from '../../utils/comprovantePdv';
import { parseNumeroInput } from '../../utils/estoqueQuiosque';
import { quantidadeDeItens, subtotalCentavos } from '../../utils/pdvCarrinho';
import type { FormaPagamentoPdv, ItemCarrinhoPdv, ProdutoPdv, VendaPdv } from '../../types/pdv';
import { usePdv } from './usePdv';
import { PixPdv } from './PixPdv';
import { PDV, styles } from './styles';

const LARGURA_DUAS_COLUNAS = 768;

/** "R$ 1.234,56" a partir de centavos, sem depender do Intl do aparelho/navegador. */
function centavos(valor: number): string {
  const negativo = valor < 0;
  const abs = Math.abs(Math.round(valor));
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${reais},${String(abs % 100).padStart(2, '0')}`;
}

function mascararDocumento(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  return digitos.length <= 11 ? formatarCpfInput(digitos) : formatarCnpjInput(digitos);
}

function Mensagem({ tipo, texto }: { tipo: 'erro' | 'aviso'; texto: string }) {
  if (!texto) return null;
  const erro = tipo === 'erro';
  return (
    <View style={[styles.mensagem, { backgroundColor: erro ? PDV.erroFundo : PDV.avisoFundo }]} accessibilityRole="alert">
      <Text style={[styles.mensagemTexto, { color: erro ? PDV.erro : PDV.avisoTexto }]}>{texto}</Text>
    </View>
  );
}

function QuantidadeInput({ item, onChange }: { item: ItemCarrinhoPdv; onChange: (q: number) => void }) {
  const [texto, setTexto] = useState(String(item.quantidade).replace('.', ','));
  useEffect(() => setTexto(String(item.quantidade).replace('.', ',')), [item.quantidade]);
  const aplicar = () => {
    const valor = parseNumeroInput(texto);
    onChange(Number.isNaN(valor) ? item.quantidade : valor);
  };
  return (
    <TextInput
      style={styles.stepperInput}
      value={texto}
      onChangeText={setTexto}
      onBlur={aplicar}
      onSubmitEditing={aplicar}
      keyboardType="decimal-pad"
      accessibilityLabel={`Quantidade de ${item.nome}`}
      selectTextOnFocus
    />
  );
}

export function PdvScreen() {
  const navigation = useNavigation<any>();
  const goBack = useAppGoBack('Home');
  const { perfilUso } = useAuth();
  const { width } = useWindowDimensions();
  const topPadding = useHeaderTopPadding(8);
  const bottomInset = useBottomInset();
  const pdv = usePdv();
  const [aba, setAba] = useState<'produtos' | 'carrinho'>('produtos');

  const ehCliente = perfilUso === 'Cliente';
  const cor = ehCliente ? CLIENTE_COLORS.primary : COMPANY_COLORS.primary;
  const corTexto = ehCliente ? '#011C46' : '#FFFFFF';
  const largo = width >= LARGURA_DUAS_COLUNAS;
  const telaQuiosques = ehCliente ? 'ClienteQuiosques' : 'Quiosque';
  const nItens = quantidadeDeItens(pdv.carrinho);

  const finalizarDesabilitado = !!pdv.pendencia || pdv.finalizando;

  // ── Cabeçalho ───────────────────────────────────────────────────────
  const cabecalho = (
    <View style={[styles.header, { backgroundColor: cor, paddingTop: topPadding }]}>
      <View style={styles.headerRow}>
        <BackButton onPress={goBack} iconColor={ehCliente ? '#011C46' : undefined} />
        <BrandLogo variant={ehCliente ? 'azul' : 'branco'} height={28} />
        <View style={{ width: 32 }} />
      </View>
      <Text style={[styles.headerTitulo, { color: corTexto }]}>PDV · Ponto de venda</Text>
      <Text style={[styles.headerSub, { color: corTexto, opacity: 0.85 }]}>
        Venda direta nos seus quiosques, com o estoque e os preços cadastrados.
      </Text>
      {pdv.quiosques.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pontos}>
          {pdv.quiosques.map((q) => {
            const ativo = q.id === pdv.barracaId;
            return (
              <TouchableOpacity
                key={q.id}
                onPress={() => pdv.trocarPontoDeVenda(q.id)}
                style={[styles.pontoChip, {
                  backgroundColor: ativo ? '#FFFFFF' : 'transparent',
                  borderColor: ativo ? '#FFFFFF' : corTexto,
                }]}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
              >
                <Text style={[styles.pontoChipTexto, { color: ativo ? '#011C46' : corTexto }]}>{q.nome}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ── Estados sem ponto de venda ──────────────────────────────────────
  if (pdv.carregandoQuiosques || pdv.erroQuiosques || pdv.quiosques.length === 0) {
    return (
      <View style={styles.root}>
        {cabecalho}
        <View style={[styles.painel, { margin: 12, flex: 0 }]}>
          {pdv.carregandoQuiosques ? (
            <View style={styles.vazio}><ActivityIndicator color={cor} /><Text style={styles.vazioTexto}>Carregando pontos de venda…</Text></View>
          ) : pdv.erroQuiosques ? (
            <View style={styles.vazio}>
              <Mensagem tipo="erro" texto={pdv.erroQuiosques} />
              <TouchableOpacity onPress={() => void pdv.carregarQuiosques()}><Text style={styles.link}>Tentar novamente</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.vazio}>
              <Ionicons name="storefront-outline" size={36} color={PDV.suave} />
              <Text style={styles.painelTitulo}>Nenhum ponto de venda</Text>
              <Text style={styles.vazioTexto}>
                O PDV vende a partir do estoque de um quiosque. Crie um quiosque e coloque produtos nele para começar.
              </Text>
              <TouchableOpacity style={[styles.botaoCompacto, { backgroundColor: cor }]} onPress={() => navigation.navigate(telaQuiosques)}>
                <Text style={[styles.botaoPrimarioTexto, { color: corTexto }]}>Ir para Quiosques</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Produtos ────────────────────────────────────────────────────────
  const renderProduto = ({ item }: { item: ProdutoPdv }) => {
    const esgotado = item.disponivel <= 0;
    return (
      <TouchableOpacity
        style={[styles.produto, esgotado && styles.produtoEsgotado]}
        onPress={() => pdv.adicionar(item)}
        disabled={esgotado}
        accessibilityRole="button"
        accessibilityLabel={`Adicionar ${item.nome}`}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.produtoNome} numberOfLines={2}>{item.nome}</Text>
          <Text style={styles.produtoMeta}>
            {item.codigoBarras ?? item.codigo} · {esgotado ? 'Sem estoque' : `${formatarQuantidade(item.disponivel, item.unidade)} disponíveis`}
          </Text>
        </View>
        <Text style={styles.produtoPreco}>{formatarPreco(item.precoVenda)}</Text>
        <View style={[styles.botaoMais, { backgroundColor: cor }]}>
          <Ionicons name="add" size={22} color={corTexto} />
        </View>
      </TouchableOpacity>
    );
  };

  const painelProdutos = (
    <View style={[styles.painel, largo && styles.painelProdutos]}>
      <View style={styles.buscaBox}>
        <Ionicons name="barcode-outline" size={20} color={PDV.suave} />
        <TextInput
          style={styles.buscaInput}
          value={pdv.busca}
          onChangeText={pdv.setBusca}
          placeholder="Código de barras ou nome do produto"
          placeholderTextColor={PDV.suave}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => void pdv.lerCodigo()}
          blurOnSubmit={false}
          autoFocus
          accessibilityLabel="Ler código de barras ou buscar produto pelo nome"
        />
        {pdv.carregandoProdutos && <ActivityIndicator size="small" color={cor} />}
        {!!pdv.busca && !pdv.carregandoProdutos && (
          <TouchableOpacity onPress={() => pdv.setBusca('')} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={18} color={PDV.suave} />
          </TouchableOpacity>
        )}
      </View>
      <Mensagem tipo="erro" texto={pdv.erroProdutos} />
      <FlatList
        data={pdv.produtos}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderProduto}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          pdv.carregandoProdutos ? undefined : (
            <View style={styles.vazio}>
              <Ionicons name="cube-outline" size={30} color={PDV.suave} />
              <Text style={styles.vazioTexto}>
                {pdv.busca ? 'Nenhum produto encontrado para esta busca.' : 'Este quiosque ainda não tem produtos. Distribua o estoque em Quiosques.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  // ── Carrinho, total e pagamento ─────────────────────────────────────
  const renderItem = (item: ItemCarrinhoPdv) => (
    <View key={item.produtoId} style={styles.item}>
      <View style={styles.itemTopo}>
        <Text style={styles.itemNome} numberOfLines={2}>{item.nome}</Text>
        <TouchableOpacity onPress={() => pdv.remover(item.produtoId)} accessibilityLabel={`Remover ${item.nome}`}>
          <Ionicons name="trash-outline" size={20} color={PDV.erro} />
        </TouchableOpacity>
      </View>
      <View style={styles.itemLinha}>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepperBotao} onPress={() => pdv.definirQuantidade(item.produtoId, item.quantidade - 1)} accessibilityLabel={`Diminuir ${item.nome}`}>
            <Ionicons name="remove" size={18} color={PDV.texto} />
          </TouchableOpacity>
          <QuantidadeInput item={item} onChange={(q) => pdv.definirQuantidade(item.produtoId, q)} />
          <TouchableOpacity style={styles.stepperBotao} onPress={() => pdv.definirQuantidade(item.produtoId, item.quantidade + 1)} accessibilityLabel={`Aumentar ${item.nome}`}>
            <Ionicons name="add" size={18} color={PDV.texto} />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.itemPreco}>{formatarPreco(item.precoUnitario)} / {item.unidade}</Text>
          <Text style={styles.itemSubtotal}>{centavos(subtotalCentavos(item))}</Text>
        </View>
      </View>
    </View>
  );

  const painelCarrinho = (
    <View style={styles.painel}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.painelTitulo}>Carrinho {nItens > 0 ? `(${nItens})` : ''}</Text>
        {pdv.carrinho.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="cart-outline" size={30} color={PDV.suave} />
            <Text style={styles.vazioTexto}>Toque em um produto para adicioná-lo.</Text>
          </View>
        ) : (
          pdv.carrinho.map(renderItem)
        )}
        <Mensagem tipo="aviso" texto={pdv.aviso} />

        <View style={styles.secao}>
          <Text style={styles.rotulo}>Cliente (opcional)</Text>
          <TextInput style={styles.input} value={pdv.clienteNome} onChangeText={pdv.setClienteNome} placeholder="Nome do cliente" maxLength={100} placeholderTextColor={PDV.suave} />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={pdv.clienteDocumento}
            onChangeText={(t) => pdv.setClienteDocumento(mascararDocumento(t))}
            placeholder="CPF ou CNPJ"
            keyboardType="number-pad"
            maxLength={18}
            placeholderTextColor={PDV.suave}
          />
        </View>

        <View style={styles.secao}>
          <Text style={styles.rotulo}>Forma de pagamento</Text>
          <View style={styles.formas}>
            {TIPOS_DISPONIVEIS.map((t) => {
              const ativo = pdv.forma === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.formaChip, ativo && { backgroundColor: cor, borderColor: cor }]}
                  onPress={() => pdv.setForma(t.id as FormaPagamentoPdv)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                >
                  <Text style={[styles.formaTexto, ativo && { color: corTexto }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {pdv.forma === 'dinheiro' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.rotulo}>Valor recebido</Text>
              <TextInput style={styles.input} value={pdv.valorRecebido} onChangeText={pdv.setValorRecebido} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={PDV.suave} />
              {pdv.troco !== null && (
                <View style={styles.linhaValores}>
                  <Text style={styles.totalRotulo}>Troco</Text>
                  <Text style={styles.trocoValor}>{centavos(pdv.troco)}</Text>
                </View>
              )}
            </View>
          )}
          {pdv.forma === 'pix' && <PixPdv totalCentavos={pdv.total} barracaId={pdv.barracaId} />}
          {pdv.forma && pdv.forma !== 'dinheiro' && pdv.forma !== 'pix' && (
            <Text style={[styles.produtoMeta, { marginTop: 8 }]}>
              Registre o pagamento na maquininha/app do banco. O sistema só anota a forma de pagamento.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Total e ações sempre visíveis, mesmo com muitos itens no carrinho */}
      <View style={styles.rodapeCarrinho}>
        <View style={[styles.linhaValores, { alignItems: 'baseline' }]}>
          <Text style={styles.totalRotulo}>Total</Text>
          <Text style={styles.totalValor}>{centavos(pdv.total)}</Text>
        </View>

        <Mensagem tipo="erro" texto={pdv.erroVenda} />
        {!!pdv.pendencia && pdv.carrinho.length > 0 && <Text style={[styles.produtoMeta, { marginTop: 8 }]}>{pdv.pendencia}</Text>}

        <View style={styles.acoes}>
          <TouchableOpacity
            style={[styles.botaoSecundario, (pdv.carrinho.length === 0 || pdv.finalizando) && styles.botaoDesabilitado]}
            onPress={pdv.limparCarrinho}
            disabled={pdv.carrinho.length === 0 || pdv.finalizando}
          >
            <Text style={styles.botaoSecundarioTexto}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botaoPrimario, { backgroundColor: cor }, finalizarDesabilitado && styles.botaoDesabilitado]}
            onPress={() => void pdv.finalizar()}
            disabled={finalizarDesabilitado}
            accessibilityRole="button"
            accessibilityState={{ disabled: finalizarDesabilitado, busy: pdv.finalizando }}
          >
            {pdv.finalizando && <ActivityIndicator color={corTexto} />}
            <Text style={[styles.botaoPrimarioTexto, { color: corTexto }]}>
              {pdv.finalizando ? 'Finalizando…' : 'Finalizar venda'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {cabecalho}
      {largo ? (
        <View style={[styles.corpo, styles.corpoLargo]}>
          {painelProdutos}
          {painelCarrinho}
        </View>
      ) : (
        <>
          <View style={styles.abas}>
            {(['produtos', 'carrinho'] as const).map((a) => (
              <TouchableOpacity key={a} style={[styles.aba, aba === a && { backgroundColor: cor }]} onPress={() => setAba(a)} accessibilityRole="tab" accessibilityState={{ selected: aba === a }}>
                <Text style={[styles.abaTexto, aba === a && { color: corTexto }]}>
                  {a === 'produtos' ? 'Produtos' : `Carrinho${nItens ? ` (${nItens})` : ''}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.corpo}>{aba === 'produtos' ? painelProdutos : painelCarrinho}</View>
          {aba === 'produtos' && nItens > 0 && (
            <View style={[styles.barraInferior, { paddingBottom: bottomInset + 10 }]}>
              <View>
                <Text style={styles.produtoMeta}>{nItens} {nItens === 1 ? 'item' : 'itens'}</Text>
                <Text style={styles.itemSubtotal}>{centavos(pdv.total)}</Text>
              </View>
              <TouchableOpacity style={[styles.botaoCompacto, { backgroundColor: cor }]} onPress={() => setAba('carrinho')}>
                <Text style={[styles.botaoPrimarioTexto, { color: corTexto }]}>Ver carrinho</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      <VendaConcluidaModal venda={pdv.vendaConcluida} cor={cor} corTexto={corTexto} onFechar={() => { pdv.fecharVenda(); setAba('produtos'); }} />
    </View>
  );
}

function VendaConcluidaModal({ venda, cor, corTexto, onFechar }: { venda: VendaPdv | null; cor: string; corTexto: string; onFechar: () => void }) {
  const [imprimindo, setImprimindo] = useState(false);
  const [erro, setErro] = useState('');
  if (!venda) return null;

  const imprimir = async () => {
    setErro('');
    setImprimindo(true);
    try {
      await imprimirComprovante(venda);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível imprimir.');
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalIcone}><Ionicons name="checkmark" size={32} color={PDV.ok} /></View>
            <Text style={styles.modalTitulo}>Venda concluída</Text>
            <Text style={styles.modalSub}>{venda.numero} · {formatarDataHora(venda.criadoEm)} · {venda.barracaNome}</Text>

            <View style={styles.recibo}>
              {venda.itens.map((i) => (
                <View key={i.produtoId} style={styles.reciboLinha}>
                  <Text style={styles.reciboTexto}>{formatarQuantidade(i.quantidade, i.unidade)} × {i.nome}</Text>
                  <Text style={styles.reciboTexto}>{formatarPreco(i.subtotal)}</Text>
                </View>
              ))}
              <View style={[styles.reciboLinha, { marginTop: 6 }]}>
                <Text style={[styles.reciboTexto, { fontWeight: '900', fontSize: 16 }]}>Total</Text>
                <Text style={[styles.reciboTexto, { fontWeight: '900', fontSize: 16 }]}>{formatarPreco(venda.total)}</Text>
              </View>
              <View style={styles.reciboLinha}>
                <Text style={styles.reciboTexto}>Pagamento</Text>
                <Text style={styles.reciboTexto}>{labelFormaPagamento(venda.formaPagamento)}</Text>
              </View>
              {venda.formaPagamento === 'dinheiro' && venda.valorRecebido != null && (
                <>
                  <View style={styles.reciboLinha}><Text style={styles.reciboTexto}>Recebido</Text><Text style={styles.reciboTexto}>{formatarPreco(venda.valorRecebido)}</Text></View>
                  <View style={styles.reciboLinha}><Text style={[styles.reciboTexto, { color: PDV.ok, fontWeight: '800' }]}>Troco</Text><Text style={[styles.reciboTexto, { color: PDV.ok, fontWeight: '800' }]}>{formatarPreco(venda.troco ?? 0)}</Text></View>
                </>
              )}
              {(venda.clienteNome || venda.clienteDocumento) && (
                <View style={styles.reciboLinha}><Text style={styles.reciboTexto}>Cliente</Text><Text style={styles.reciboTexto}>{[venda.clienteNome, venda.clienteDocumento].filter(Boolean).join(' · ')}</Text></View>
              )}
              <Text style={styles.semValorFiscal}>COMPROVANTE SEM VALOR FISCAL</Text>
            </View>

            <Mensagem tipo="erro" texto={erro} />
            <View style={styles.acoes}>
              <TouchableOpacity style={[styles.botaoSecundario, imprimindo && styles.botaoDesabilitado]} onPress={() => void imprimir()} disabled={imprimindo}>
                <Text style={styles.botaoSecundarioTexto}>{imprimindo ? 'Abrindo…' : 'Imprimir comprovante'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoPrimario, { backgroundColor: cor }]} onPress={onFechar}>
                <Text style={[styles.botaoPrimarioTexto, { color: corTexto }]}>Nova venda</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
