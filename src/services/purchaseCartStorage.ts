import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, StoredPurchaseCart } from '../types/marketplace';

export type { CartItem, StoredPurchaseCart };

const CART_KEY_PREFIX = '@stock4event_purchase_cart';

interface LegacyStoredPurchaseCart {
  fornecedorId?: number | null;
  fornecedorNome?: string | null;
  itens: Array<Partial<CartItem> & { produtoId: number }>;
}

function storageKey(empresaId: number): string {
  return `${CART_KEY_PREFIX}_${empresaId}`;
}

function normalizeStoredCart(raw: LegacyStoredPurchaseCart): StoredPurchaseCart | null {
  if (!Array.isArray(raw.itens)) return null;

  const legacyFornecedorId = raw.fornecedorId ?? null;
  const legacyFornecedorNome = raw.fornecedorNome ?? null;

  const itens = raw.itens
    .map((item) => {
      const fornecedorId = item.fornecedorId ?? legacyFornecedorId;
      if (fornecedorId == null || !item.produtoId || !item.nome) return null;

      const normalizedItem: CartItem = {
        produtoId: item.produtoId,
        fornecedorId,
        fornecedorNome: item.fornecedorNome ?? legacyFornecedorNome ?? 'Fornecedor',
        nome: item.nome,
        preco: Number(item.preco ?? 0),
        unidade: item.unidade ?? 'UN',
        quantidade: Number(item.quantidade ?? 1),
        imagemUrl: item.imagemUrl,
      };
      if (item.tipoVenda === 'palete' && item.unidadesPorPalete) {
        normalizedItem.tipoVenda = 'palete';
        normalizedItem.unidadesPorPalete = Number(item.unidadesPorPalete);
      }

      return normalizedItem;
    })
    .filter((item): item is CartItem => item !== null && item !== undefined);

  return { itens };
}

export async function loadPurchaseCart(
  empresaId: number,
): Promise<StoredPurchaseCart | null> {
  const raw = await AsyncStorage.getItem(storageKey(empresaId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LegacyStoredPurchaseCart;
    return normalizeStoredCart(parsed);
  } catch {
    await AsyncStorage.removeItem(storageKey(empresaId));
    return null;
  }
}

export async function savePurchaseCart(
  empresaId: number,
  cart: StoredPurchaseCart,
): Promise<void> {
  if (cart.itens.length === 0) {
    await clearPurchaseCart(empresaId);
    return;
  }

  await AsyncStorage.setItem(storageKey(empresaId), JSON.stringify(cart));
}

export async function clearPurchaseCart(empresaId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKey(empresaId));
}

export function cartItemKey(
  item: Pick<CartItem, 'fornecedorId' | 'produtoId'> & Pick<Partial<CartItem>, 'tipoVenda'>,
): string {
  return `${item.fornecedorId}-${item.produtoId}-${item.tipoVenda === 'palete' ? 'palete' : 'unidade'}`;
}
