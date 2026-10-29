import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Produto } from '../services/productService';
import { useAuth } from './AuthContext';
import {
  clearPurchaseCart,
  loadPurchaseCart,
  savePurchaseCart,
  CartItem,
  cartItemKey,
} from '../services/purchaseCartStorage';
import {
  adicionarItem,
  alterarQuantidade,
  removerItem,
} from '../utils/sacolaCarrinho';

export type { CartItem };

export const TAXA_ENTREGA = 7;

export interface FornecedorGrupo {
  fornecedorId: number;
  fornecedorNome: string;
  itens: CartItem[];
  subtotal: number;
}

interface FornecedorRef {
  id: number;
  nome: string;
}

export interface ResultadoAdicao {
  adicionado: boolean;
  /** Só vem quando `adicionado` é false: o texto a mostrar ao usuário. */
  motivo?: string;
}

interface PurchaseCartContextValue {
  itens: CartItem[];
  gruposFornecedor: FornecedorGrupo[];
  itemCount: number;
  total: number;
  taxaEntregaTotal: number;
  isHydrated: boolean;
  /** Resolve com `adicionado: false` e um `motivo` quando o item não cabe na sacola. */
  addItem: (
    produto: Produto,
    fornecedor: FornecedorRef,
    quantidade?: number,
  ) => Promise<ResultadoAdicao>;
  updateQuantity: (fornecedorId: number, produtoId: number, quantidade: number) => void;
  removeItem: (fornecedorId: number, produtoId: number) => void;
  clear: () => void;
}

const PurchaseCartContext = createContext<PurchaseCartContextValue | null>(null);

function buildGruposFornecedor(itens: CartItem[]): FornecedorGrupo[] {
  const map = new Map<number, FornecedorGrupo>();

  for (const item of itens) {
    const existing = map.get(item.fornecedorId);
    if (existing) {
      existing.itens.push(item);
      existing.subtotal += item.preco * item.quantidade;
    } else {
      map.set(item.fornecedorId, {
        fornecedorId: item.fornecedorId,
        fornecedorNome: item.fornecedorNome,
        itens: [item],
        subtotal: item.preco * item.quantidade,
      });
    }
  }

  return Array.from(map.values());
}

export function PurchaseCartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const empresaId = user?.empresa?.id ?? null;

  const [itens, setItens] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const hydratedEmpresaRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    setItens([]);
    if (empresaId) {
      void clearPurchaseCart(empresaId);
    }
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) {
      setItens([]);
      setIsHydrated(false);
      hydratedEmpresaRef.current = null;
      return;
    }

    if (hydratedEmpresaRef.current === empresaId) return;

    let cancelled = false;
    setIsHydrated(false);

    (async () => {
      const stored = await loadPurchaseCart(empresaId);
      if (cancelled) return;

      setItens((current) => {
        if (current.length > 0) return current;
        return stored?.itens ?? [];
      });

      hydratedEmpresaRef.current = empresaId;
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || !isHydrated) return;
    void savePurchaseCart(empresaId, { itens });
  }, [empresaId, isHydrated, itens]);

  /**
   * Espelho síncrono de `itens`. O atualizador do setState roda depois, então
   * sem isso não dá para saber na hora se o item entrou — era por isso que
   * addItem devolvia false mesmo quando funcionava.
   */
  const itensRef = useRef<CartItem[]>(itens);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);

  const addItem = useCallback(
    async (produto: Produto, fornecedor: FornecedorRef, quantidade = 1) => {
      const resultado = adicionarItem(
        itensRef.current,
        {
          id: produto.id,
          nome: produto.nome,
          precoVenda: produto.precoVenda,
          unidade: produto.unidade,
          imagemUrl: produto.imagemUrl,
          estoque: produto.estoque,
        },
        fornecedor,
        quantidade,
      );

      if (resultado.adicionado) {
        itensRef.current = resultado.itens;
        setItens(resultado.itens);
      }

      return { adicionado: resultado.adicionado, motivo: resultado.motivo };
    },
    [],
  );

  const updateQuantity = useCallback(
    (fornecedorId: number, produtoId: number, quantidade: number) => {
      setItens((prev) => alterarQuantidade(prev, fornecedorId, produtoId, quantidade));
    },
    [],
  );

  const removeItem = useCallback((fornecedorId: number, produtoId: number) => {
    setItens((prev) => removerItem(prev, fornecedorId, produtoId));
  }, []);

  const gruposFornecedor = useMemo(() => buildGruposFornecedor(itens), [itens]);

  const itemCount = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade, 0),
    [itens],
  );

  const total = useMemo(
    () => itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0),
    [itens],
  );

  const taxaEntregaTotal = useMemo(
    () => TAXA_ENTREGA * gruposFornecedor.length,
    [gruposFornecedor.length],
  );

  const value = useMemo(
    () => ({
      itens,
      gruposFornecedor,
      itemCount,
      total,
      taxaEntregaTotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [
      itens,
      gruposFornecedor,
      itemCount,
      total,
      taxaEntregaTotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    ],
  );

  return (
    <PurchaseCartContext.Provider value={value}>{children}</PurchaseCartContext.Provider>
  );
}

export function usePurchaseCart() {
  const context = useContext(PurchaseCartContext);
  if (!context) {
    throw new Error('usePurchaseCart deve ser usado dentro de PurchaseCartProvider.');
  }
  return context;
}

export { cartItemKey };
