import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationsModal } from '../../components/Card/NotificationsModal';
import { EnderecoFormModal } from '../../components/Card/EnderecoFormModal';
import { CheckoutPaymentModal } from '../../components/Card/CheckoutPaymentModal';
import { RemoteImage } from '../../components/media/RemoteImage';
import { BottomTabBar, useBottomTabBarHeight } from '../../components/layout/BottomTabBar';
import { useHeaderTopPadding } from '../../utils/safeArea';
import { formatarPreco } from '../../services/productService';
import { cartItemKey } from '../../services/purchaseCartStorage';
import { useSacola } from '../Sacola/useSacola';
import { PRIMARY, styles } from './styles';
import { BrandLogo } from '../../components/brand/BrandLogo';

export function ReservasScreen() {
  const topPadding = useHeaderTopPadding(8);
  const tabBarHeight = useBottomTabBarHeight();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const {
    navigation,
    user,
    gruposFornecedor,
    recebedores,
    itemCount,
    total,
    updateQuantity,
    removeItem,
    enderecos,
    enderecoSelecionado,
    loadingEnderecos,
    modalEndereco,
    setModalEndereco,
    modalCadastroEndereco,
    setModalCadastroEndereco,
    loading,
    error,
    successMessage,
    modalPagamento,
    setModalPagamento,
    selecionarEndereco,
    handleEnderecoSalvo,
    abrirSelecaoEndereco,
    handleSubmit,
    processarCheckout,
    totalComTaxa,
    sacolaVazia,
    metodoPagamento,
  } = useSacola();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16, flexGrow: 1 }}
      >
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerTop}>
            <BrandLogo variant="azul" height={34} />
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setNotificationsOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Carrinho</Text>
          <Text style={styles.subtitle}>Confira as bebidas do seu pedido.</Text>
        </View>

        <View style={styles.sheet}>
          {sacolaVazia ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cart-outline" size={48} color={PRIMARY} />
              <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
              <Text style={styles.emptyText}>
                Explore os quiosques e adicione bebidas para montar seu pedido.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => navigation.navigate('Explorar')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Ver produtos</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {gruposFornecedor.map((grupo) => (
                <View key={grupo.fornecedorId} style={styles.sellerCard}>
                  <View style={styles.sellerHeader}>
                    <View style={styles.sellerLogo}>
                      <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
                    </View>
                    <View style={styles.sellerCopy}>
                      <Text style={styles.sellerKicker}>Vendido por</Text>
                      <Text style={styles.sellerName} numberOfLines={1}>
                        {grupo.fornecedorNome}
                      </Text>
                    </View>
                  </View>

                  {grupo.itens.map((item) => (
                    <View key={cartItemKey(item)} style={styles.itemRow}>
                      <RemoteImage
                        uri={item.imagemUrl}
                        style={styles.itemImage}
                        fallbackLabel={item.nome}
                      />
                      <View style={styles.itemBody}>
                        <View style={styles.itemTop}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.nome}
                          </Text>
                          <TouchableOpacity
                            style={styles.trashBtn}
                            onPress={() => removeItem(item.fornecedorId, item.produtoId)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#9AA3B2" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.itemUnit}>{item.unidade}</Text>
                        <View style={styles.itemBottom}>
                          <Text style={styles.itemPrice}>{formatarPreco(item.preco)}</Text>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() =>
                                updateQuantity(
                                  item.fornecedorId,
                                  item.produtoId,
                                  item.quantidade - 1,
                                )
                              }
                            >
                              <Ionicons name="remove" size={14} color={PRIMARY} />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{item.quantidade}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() =>
                                updateQuantity(
                                  item.fornecedorId,
                                  item.produtoId,
                                  item.quantidade + 1,
                                )
                              }
                            >
                              <Ionicons name="add" size={14} color={PRIMARY} />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.itemSubtotal}>
                            {formatarPreco(item.preco * item.quantidade)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              <TouchableOpacity
                style={styles.addressCard}
                onPress={abrirSelecaoEndereco}
                disabled={loadingEnderecos}
                activeOpacity={0.85}
              >
                <View style={styles.addressIcon}>
                  <Ionicons name="car-outline" size={20} color={PRIMARY} />
                </View>
                <View style={styles.addressCopy}>
                  <Text style={styles.addressTitle}>Entrega ou retirada</Text>
                  <Text style={styles.addressHint} numberOfLines={2}>
                    {loadingEnderecos
                      ? 'Carregando endereço…'
                      : enderecoSelecionado
                        ? enderecoSelecionado.resumo
                        : 'Definir endereço'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C5CAD3" />
              </TouchableOpacity>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resumo do pedido</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Subtotal de itens ({itemCount} {itemCount === 1 ? 'unidade' : 'unidades'})
                  </Text>
                  <Text style={styles.summaryValue}>{formatarPreco(total)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatarPreco(total)}</Text>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              <TouchableOpacity
                style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.checkoutText}>Finalizar pedido</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <BottomTabBar activeRoute="Reservas" />

      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        empresaId={user?.empresa?.id}
      />

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
              <Ionicons name="add" size={18} color="#FFAD19" />
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
    </View>
  );
}
