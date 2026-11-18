import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BackTitleHeader } from '../../components/Header/BackTitleHeader';
import { HeaderCartBadge } from '../../components/Header/HeaderCartBadge';
import { RemoteImage } from '../../components/media/RemoteImage';
import { getImageUrl } from '../../config/api';
import { formatarPreco } from '../../services/productService';
import { styles } from './styles';
import { useProductDetail } from './useProductDetail';
import { useAuth } from '../../context/AuthContext';
import { ClienteProductDetail } from './ClienteProductDetail';
import { TipoVendaSelector } from '../../components/produto/TipoVendaSelector';

export function ProductDetailScreen() {
  const {
    navigation,
    goBack,
    itemCount,
    fornecedorNome,
    fornecedorDescricao,
    fornecedorLogoUrl,
    isCatalogo,
    productName,
    descricao,
    imagemUrl,
    unidade,
    precoVenda,
    productCodigo,
    loading,
    quantity,
    setQuantity,
    observation,
    setObservation,
    feedback,
    adding,
    estoque,
    estoqueRestante,
    esgotado,
    estoqueLabel,
    estoqueColor,
    handleAddToCart,
    precoPalete,
    unidadesPorPalete,
    temPalete,
    tipoVenda,
    setTipoVenda,
    precoSelecionado,
    maximoSelecionavel,
  } = useProductDetail();
  const { perfilUso } = useAuth();

  if (perfilUso === 'Cliente' && !isCatalogo) {
    return (
      <ClienteProductDetail
        productName={productName}
        descricao={descricao}
        imagemUrl={imagemUrl}
        unidade={unidade}
        precoVenda={precoVenda}
        productCodigo={productCodigo}
        fornecedorNome={fornecedorNome}
        fornecedorLogoUrl={fornecedorLogoUrl}
        quantity={quantity}
        setQuantity={setQuantity}
        estoqueRestante={estoqueRestante}
        esgotado={esgotado}
        adding={adding}
        feedback={feedback}
        loading={loading}
        onBack={goBack}
        onOpenStore={goBack}
        onAddToCart={handleAddToCart}
        temPalete={temPalete}
        tipoVenda={tipoVenda}
        onChangeTipoVenda={setTipoVenda}
        precoPalete={precoPalete}
        unidadesPorPalete={unidadesPorPalete}
        precoSelecionado={precoSelecionado}
        maximoSelecionavel={maximoSelecionavel}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <BackTitleHeader
          title="Detalhes do produto"
          onBack={goBack}
          rightSlot={
            itemCount > 0 ? (
              <HeaderCartBadge
                itemCount={itemCount}
                onPress={() => navigation.navigate('Sacola')}
              />
            ) : undefined
          }
        />

        <View style={styles.heroCard}>
          <View style={styles.imageWrap}>
            {imagemUrl ? (
              <RemoteImage
                uri={getImageUrl(imagemUrl)}
                style={styles.heroImage}
                fallbackLabel={productName}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="wine-outline" size={48} color="#999" />
              </View>
            )}
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.productName}>{productName.replace('\n', ' ')}</Text>
            {productCodigo ? (
              <Text style={styles.productCode}>ID {productCodigo}</Text>
            ) : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatarPreco(precoVenda)}</Text>
              <View style={styles.unitChip}>
                <Text style={styles.unitChipText}>/{unidade}</Text>
              </View>
            </View>

            {!isCatalogo && temPalete && precoPalete && unidadesPorPalete ? (
              <TipoVendaSelector
                tipoVenda={tipoVenda}
                onChange={setTipoVenda}
                precoVenda={precoVenda}
                precoPalete={precoPalete}
                unidadesPorPalete={unidadesPorPalete}
                unidade={unidade}
              />
            ) : null}

            <View style={[styles.stockBadge, { borderColor: estoqueColor }]}>
              <Ionicons name="cube-outline" size={16} color={estoqueColor} />
              <Text style={[styles.stockText, { color: estoqueColor }]}>
                {loading ? 'Atualizando estoque...' : estoqueLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.storeCard}
          activeOpacity={0.85}
          onPress={goBack}
          disabled={isCatalogo}
        >
          <RemoteImage
            uri={getImageUrl(fornecedorLogoUrl)}
            style={styles.storeLogo}
            fallbackLabel={fornecedorNome}
            resizeMode="cover"
          />
          <View style={styles.storeInfo}>
            <Text style={styles.storeLabel}>
              {isCatalogo ? 'Produto do seu catálogo' : 'Vendido por'}
            </Text>
            <Text style={styles.storeName} numberOfLines={1}>
              {fornecedorNome}
            </Text>
            <Text style={styles.storeDesc} numberOfLines={2}>
              {fornecedorDescricao ||
                (isCatalogo
                  ? 'Item cadastrado na sua empresa para controle de estoque.'
                  : 'Distribuidora parceira de bebidas para revenda.')}
            </Text>
          </View>
          {!isCatalogo ? (
          <Ionicons name="chevron-forward" size={16} color="#D4B56A" />
          ) : null}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre o produto</Text>
          <Text style={styles.description}>
            {descricao || 'Produto disponível para solicitação de compra ao fornecedor.'}
          </Text>
        </View>

        {!isCatalogo ? (
          <View style={styles.section}>
            <View style={styles.observationTitleRow}>
              <Ionicons name="create-outline" size={18} color="#333" />
              <Text style={styles.observationTitle}>Observações do pedido</Text>
            </View>
            <TextInput
              value={observation}
              onChangeText={setObservation}
              placeholder="Ex.: entregar antes das 18h"
              placeholderTextColor="#999"
              style={styles.observationInput}
              multiline
            />
          </View>
        ) : null}

        {feedback ? (
          <Text
            style={[
              styles.feedbackText,
              feedback.includes('adicionado') ? styles.feedbackOk : styles.feedbackErr,
            ]}
          >
            {feedback}
          </Text>
        ) : null}
      </ScrollView>

      {!isCatalogo ? (
        <View style={styles.bottomBar}>
          <View style={styles.quantityBox}>
            <TouchableOpacity
              style={[styles.quantityButton, esgotado && styles.quantityButtonDisabled]}
              activeOpacity={0.8}
              disabled={esgotado}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={22} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{quantity}</Text>

            <TouchableOpacity
              style={[styles.quantityButton, esgotado && styles.quantityButtonDisabled]}
              activeOpacity={0.8}
              disabled={esgotado || quantity >= maximoSelecionavel}
              onPress={() => setQuantity((q) => Math.min(maximoSelecionavel, q + 1))}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, (esgotado || adding) && styles.addButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleAddToCart}
            disabled={esgotado || adding}
          >
            {adding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.addButtonText}>{esgotado ? 'Esgotado' : 'Adicionar'}</Text>
                {!esgotado ? (
                  <Text style={styles.addButtonPrice}>{formatarPreco(precoSelecionado * quantity)}</Text>
                ) : null}
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.catalogFooter}>
          <View style={[styles.catalogStockBadge, { borderColor: estoqueColor }]}>
            <Ionicons name="cube-outline" size={18} color={estoqueColor} />
            <Text style={[styles.catalogStockText, { color: estoqueColor }]}>
              {loading ? 'Atualizando...' : `${estoque} ${unidade} em estoque`}
            </Text>
          </View>
          <Text style={styles.catalogPrice}>{formatarPreco(precoVenda)}</Text>
        </View>
      )}

      {!isCatalogo && feedback.includes('adicionado') ? (
        <TouchableOpacity
          style={styles.checkoutFab}
          onPress={() => navigation.navigate('Sacola')}
        >
          <Text style={styles.checkoutFabText}>Ir ao carrinho</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}
