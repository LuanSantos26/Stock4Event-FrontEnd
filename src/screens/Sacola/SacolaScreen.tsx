import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { TabScreenLayout } from '../../components/layout/TabScreenLayout';
import { PagePrimaryButton } from '../../components/Button/PagePrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { SacolaItemRow } from './components/SacolaItemRow';
import { EnderecoFormModal } from '../../components/Card/EnderecoFormModal';
import { CheckoutPaymentModal } from '../../components/Card/CheckoutPaymentModal';
import { formatarPreco } from '../../services/productService';
import { MetodoPagamento } from '../../services/marketplaceService';
import { iconeTipoPagamento } from '../../services/formaPagamentoService';
import { cartItemKey } from '../../services/purchaseCartStorage';
import { METODOS_PADRAO, useSacola } from './useSacola';
import { styles } from './styles';
import { COMPANY_COLORS } from '../../theme/theme';

export function SacolaScreen() {
  const {
    navigation,
    scrollBottomPadding,
    scrollBottomPaddingWithFooter,
    user,
    gruposFornecedor,
    recebedores,
    itemCount,
    total,
    taxaEntregaTotal,
    updateQuantity,
    removeItem,
    editMode,
    setEditMode,
    enderecos,
    enderecoErro,
    enderecoSelecionado,
    formasPagamento,
    metodoPagamento,
    setMetodoPagamento,
    loadingEnderecos,
    loadingFormas,
    formasErro,
    modalEndereco,
    setModalEndereco,
    modalCadastroEndereco,
    setModalCadastroEndereco,
    loading,
    error,
    successMessage,
    modalPagamento,
    setModalPagamento,
    carregarEnderecos,
    carregarFormasPagamento,
    handleClearAll,
    formatItemCount,
    selecionarEndereco,
    handleEnderecoSalvo,
    abrirSelecaoEndereco,
    handleSubmit,
    processarCheckout,
    totalComTaxa,
    sacolaVazia,
    pedidoCount,
    taxaEntregaLabel,
  } = useSacola();


  return (
    <>
      <TabScreenLayout
        title="Sacola de compras"
        subtitle={itemCount > 0 ? formatItemCount(itemCount) : undefined}
        scrollContentStyle={{
          paddingBottom: sacolaVazia ? scrollBottomPadding : scrollBottomPaddingWithFooter,
        }}
        footer={
          !sacolaVazia ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || editMode}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {pedidoCount > 1 ? 'Finalizar pedidos' : 'Finalizar pedido'} ·{' '}
                    {formatarPreco(totalComTaxa)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : undefined
        }
        tabBar={<BottomTabBar activeRoute="Sacola" />}
      >
        {itemCount > 0 ? (
          <PagePrimaryButton
            label={editMode ? 'Concluir edição' : 'Editar sacola'}
            icon={editMode ? 'checkmark-circle-outline' : 'create-outline'}
            onPress={() => setEditMode((prev) => !prev)}
            compact
            light
          />
        ) : null}
        {sacolaVazia ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyHeader}>
              <Text style={styles.emptyKicker}>Sacola</Text>
              <Text style={styles.emptyTitle}>Sua sacola está vazia</Text>
              <Text style={styles.emptyText}>
                Explore as distribuidoras e adicione bebidas para fazer seu pedido.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emptyAction}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Cart')}
            >
              <View style={styles.emptyActionIcon}>
                <Ionicons name="storefront-outline" size={22} color={COMPANY_COLORS.primary} />
              </View>
              <View style={styles.emptyActionCopy}>
                <Text style={styles.emptyActionTitle}>Explorar lojas</Text>
                <Text style={styles.emptyActionHint}>Ver distribuidoras em destaque</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D4B56A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyAction, styles.emptyActionLast]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Home')}
            >
              <View style={styles.emptyActionIcon}>
                <Ionicons name="home-outline" size={22} color={COMPANY_COLORS.primary} />
              </View>
              <View style={styles.emptyActionCopy}>
                <Text style={styles.emptyActionTitle}>Ir para o início</Text>
                <Text style={styles.emptyActionHint}>Acompanhar estoque e operação</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D4B56A" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitleHero}>Itens do pedido</Text>
            <Text style={styles.sectionSubtitle}>Revise as bebidas antes de finalizar</Text>
          </View>
          {editMode && itemCount > 0 ? (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.removeAllText}>Remover todos</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {gruposFornecedor.map((grupo) => (
          <View key={grupo.fornecedorId} style={styles.grupoCard}>
            <View style={styles.grupoHeader}>
              <View style={styles.grupoNomeWrap}>
                <Ionicons name="storefront-outline" size={16} color={COMPANY_COLORS.primary} />
                <Text style={styles.grupoNome} numberOfLines={1}>
                  {grupo.fornecedorNome}
                </Text>
              </View>
              <Text style={styles.grupoSubtotal}>{formatarPreco(grupo.subtotal)}</Text>
            </View>
            {grupo.itens.map((item, index) => (
              <SacolaItemRow
                key={cartItemKey(item)}
                item={item}
                editMode={editMode}
                nested
                isLast={index === grupo.itens.length - 1}
                onUpdateQuantity={(qty) =>
                  updateQuantity(item.fornecedorId, item.produtoId, qty)
                }
                onRemove={() => removeItem(item.fornecedorId, item.produtoId)}
              />
            ))}
          </View>
        ))}
        </View>
        <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>Endereço de entrega</Text>
          <Text style={styles.sectionSubtitle}>Onde o pedido deve chegar</Text>
        </View>
        <TouchableOpacity
          style={[styles.addressCard, enderecos.length === 0 && !loadingEnderecos && styles.addressCardEmpty]}
          onPress={abrirSelecaoEndereco}
          disabled={loadingEnderecos}
        >
          {loadingEnderecos ? (
            <ActivityIndicator color={COMPANY_COLORS.primary} />
          ) : enderecoSelecionado ? (
            <>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location-outline" size={22} color={COMPANY_COLORS.primary} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressApelido}>{enderecoSelecionado.apelido}</Text>
                <Text style={styles.addressResumo} numberOfLines={2}>{enderecoSelecionado.resumo}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D4B56A" />
            </>
          ) : (
            <>
              <View style={styles.addressIconWrap}>
                <Ionicons name="add-circle-outline" size={24} color={COMPANY_COLORS.primary} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressCadastroTitle}>Cadastrar endereço de entrega</Text>
                <Text style={styles.addressCadastroHint}>
                  {enderecoErro || 'Toque para informar onde receber seu pedido'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D4B56A" />
            </>
          )}
        </TouchableOpacity>
        {enderecoErro && enderecos.length === 0 ? (
          <TouchableOpacity onPress={carregarEnderecos}>
            <Text style={styles.retryText}>Tocar para tentar novamente</Text>
          </TouchableOpacity>
        ) : null}
        </View>
        <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>Forma de pagamento</Text>
          <Text style={styles.sectionSubtitle}>Escolha como deseja pagar</Text>
        </View>
        {loadingFormas ? (
          <ActivityIndicator color={COMPANY_COLORS.primary} style={{ marginVertical: 12 }} />
        ) : (
          <View style={styles.paymentRow}>
            {METODOS_PADRAO.map((forma) => {
              const atual: MetodoPagamento = metodoPagamento ?? 'pix';
              // "Cartão" fica marcado tanto para crédito quanto para débito.
              const selected = forma.id === 'credito' ? atual === 'credito' || atual === 'debito' : atual === forma.id;
              return (
                <TouchableOpacity
                  key={forma.id}
                  style={[styles.paymentChip, selected && styles.paymentChipSelected]}
                  onPress={() => setMetodoPagamento(forma.id)}
                >
                  <Ionicons
                    name={iconeTipoPagamento(forma.id)}
                    size={16}
                    color={selected ? '#FFF' : COMPANY_COLORS.primary}
                  />
                  <Text style={[styles.paymentLabel, selected && styles.paymentLabelSelected]}>
                    {forma.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Text style={styles.paymentHint}>
          {(metodoPagamento ?? 'pix') === 'boleto'
            ? 'O boleto sai com os dados bancários de cada fornecedor.'
            : (metodoPagamento ?? 'pix') === 'pix'
              ? 'Você paga pela chave Pix de cada fornecedor.'
              : 'Escolha crédito ou débito e o cartão na próxima etapa.'}
        </Text>
        </View>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBlock}>
            <Text style={styles.sectionTitle}>Resumo</Text>
            <Text style={styles.sectionSubtitle}>Valores do pedido</Text>
          </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatarPreco(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{taxaEntregaLabel}</Text>
            <Text style={styles.summaryValue}>{formatarPreco(taxaEntregaTotal)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatarPreco(totalComTaxa)}</Text>
          </View>
        </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
          </>
        )}
      </TabScreenLayout>
      <Modal visible={modalEndereco} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalEndereco(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Escolher endereço</Text>
            {enderecos.map((endereco) => {
              const selected = enderecoSelecionado?.id === endereco.id;
              return (
                <TouchableOpacity
                  key={endereco.id}
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => selecionarEndereco(endereco)}
                >
                  <Text style={styles.modalApelido}>{endereco.apelido}</Text>
                  <Text style={styles.modalResumo}>{endereco.resumo}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalEndereco(false)}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAddBtn}
              onPress={() => {
                setModalEndereco(false);
                setModalCadastroEndereco(true);
              }}
            >
              <Ionicons name="add" size={18} color={COMPANY_COLORS.primary} />
              <Text style={styles.modalAddBtnText}>Adicionar novo endereço</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      {user?.empresa?.id ? (
        <EnderecoFormModal
          visible={modalCadastroEndereco}
          empresaId={user.empresa.id}
          isFirstAddress={enderecos.length === 0}
          onClose={() => setModalCadastroEndereco(false)}
          onSaved={handleEnderecoSalvo}
        />
      ) : null}
      {user?.empresa?.id ? (
        <CheckoutPaymentModal
          visible={modalPagamento}
          total={totalComTaxa}
          metodoInicial={metodoPagamento ?? 'pix'}
          empresaId={user.empresa.id}
          cnpjEmpresa={user.empresa.cnpj}
          enderecoResumo={enderecoSelecionado?.resumo}
          recebedores={recebedores}
          onClose={() => setModalPagamento(false)}
          onConfirm={processarCheckout}
        />
      ) : null}
    </>
  );
}