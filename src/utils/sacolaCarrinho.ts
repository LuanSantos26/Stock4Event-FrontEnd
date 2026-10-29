import type { CartItem } from '../types/marketplace';

/**
 * Regras da sacola do marketplace, em funções puras.
 *
 * Ficam fora do contexto React de propósito: o atualizador passado a setState
 * roda depois, então calcular o resultado lá dentro e ler uma variável logo em
 * seguida devolve o valor errado. Aqui o resultado é calculado na hora, dá para
 * testar sem montar a árvore de componentes, e o contexto só grava o que sai daqui.
 */

export interface ProdutoParaSacola {
  id: number;
  nome: string;
  precoVenda: number;
  unidade: string;
  imagemUrl?: string;
  /** Null ou undefined quando o fornecedor não controla estoque desse item. */
  estoque?: number | null;
}

export interface FornecedorRef {
  id: number;
  nome: string;
}

export interface ResultadoSacola {
  itens: CartItem[];
  /** false quando nada mudou, por exemplo se faltou estoque. */
  adicionado: boolean;
  /** Preenchido só quando `adicionado` é false, para a tela explicar o motivo. */
  motivo?: string;
}

/** Só unidades inteiras entram na sacola; o estoque pode vir fracionado do banco. */
export function estoqueDisponivel(estoque?: number | null): number | undefined {
  if (estoque == null) return undefined;
  return Math.floor(estoque);
}

export function encontrarItem(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
): CartItem | undefined {
  return itens.find((item) => item.fornecedorId === fornecedorId && item.produtoId === produtoId);
}

/**
 * Acrescenta `quantidade` do produto, somando ao que já estiver na sacola.
 * Recusa quando a soma passa do estoque, e aí devolve a sacola intacta.
 */
export function adicionarItem(
  itens: CartItem[],
  produto: ProdutoParaSacola,
  fornecedor: FornecedorRef,
  quantidade = 1,
): ResultadoSacola {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { itens, adicionado: false, motivo: 'Informe uma quantidade maior que zero.' };
  }

  const existente = encontrarItem(itens, fornecedor.id, produto.id);
  const quantidadeFinal = (existente?.quantidade ?? 0) + quantidade;
  const disponivel = estoqueDisponivel(produto.estoque);

  if (disponivel != null && quantidadeFinal > disponivel) {
    const motivo =
      disponivel === 0
        ? `"${produto.nome}" está sem estoque.`
        : `Estoque disponível de "${produto.nome}": ${disponivel}.`;
    return { itens, adicionado: false, motivo };
  }

  if (existente) {
    return {
      adicionado: true,
      itens: itens.map((item) =>
        item.fornecedorId === fornecedor.id && item.produtoId === produto.id
          ? { ...item, quantidade: quantidadeFinal }
          : item,
      ),
    };
  }

  return {
    adicionado: true,
    itens: [
      ...itens,
      {
        produtoId: produto.id,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
        nome: produto.nome,
        preco: produto.precoVenda,
        unidade: produto.unidade,
        quantidade,
        imagemUrl: produto.imagemUrl,
      },
    ],
  };
}

/** Quantidade zero ou negativa remove o item, como no carrinho do PDV. */
export function alterarQuantidade(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
  quantidade: number,
): CartItem[] {
  if (quantidade <= 0) {
    return removerItem(itens, fornecedorId, produtoId);
  }
  return itens.map((item) =>
    item.fornecedorId === fornecedorId && item.produtoId === produtoId
      ? { ...item, quantidade }
      : item,
  );
}

export function removerItem(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
): CartItem[] {
  return itens.filter(
    (item) => !(item.fornecedorId === fornecedorId && item.produtoId === produtoId),
  );
}

export function contarItens(itens: CartItem[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

export function somarTotal(itens: CartItem[]): number {
  return itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}
