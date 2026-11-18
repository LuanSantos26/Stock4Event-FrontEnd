import type { CartItem, TipoVenda } from '../types/marketplace';

/**
 * Regras da sacola do marketplace, em funções puras.
 *
 * Ficam fora do contexto React de propósito: o atualizador passado a setState
 * roda depois, então calcular o resultado lá dentro e ler uma variável logo em
 * seguida devolve o valor errado. Aqui o resultado é calculado na hora, dá para
 * testar sem montar a árvore de componentes, e o contexto só grava o que sai daqui.
 *
 * Um mesmo produto pode estar na sacola duas vezes: por unidade e em palete fechado.
 * Por isso os itens são identificados por fornecedor + produto + tipo de venda.
 */

export interface ProdutoParaSacola {
  id: number;
  nome: string;
  precoVenda: number;
  unidade: string;
  imagemUrl?: string;
  /** Null ou undefined quando o fornecedor não controla estoque desse item (em unidades). */
  estoque?: number | null;
  /** Preço do palete fechado; só usado quando o item é vendido por palete. */
  precoPalete?: number | null;
  unidadesPorPalete?: number | null;
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

function tipoDe(item: Pick<CartItem, 'tipoVenda'>): TipoVenda {
  return item.tipoVenda === 'palete' ? 'palete' : 'unidade';
}

function mesmoItem(
  item: CartItem,
  fornecedorId: number,
  produtoId: number,
  tipoVenda: TipoVenda,
): boolean {
  return item.fornecedorId === fornecedorId && item.produtoId === produtoId && tipoDe(item) === tipoVenda;
}

/** Quantas unidades do estoque um item da sacola ocupa. */
export function unidadesDoItem(item: CartItem): number {
  return tipoDe(item) === 'palete' ? item.quantidade * (item.unidadesPorPalete ?? 1) : item.quantidade;
}

/** Só unidades inteiras entram na sacola; o estoque pode vir fracionado do banco. */
export function estoqueDisponivel(estoque?: number | null): number | undefined {
  if (estoque == null) return undefined;
  return Math.floor(estoque);
}

/** Unidades desse produto já na sacola, somando unidade e palete. */
export function unidadesNaSacola(itens: CartItem[], fornecedorId: number, produtoId: number): number {
  return itens
    .filter((item) => item.fornecedorId === fornecedorId && item.produtoId === produtoId)
    .reduce((soma, item) => soma + unidadesDoItem(item), 0);
}

export function encontrarItem(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
  tipoVenda: TipoVenda = 'unidade',
): CartItem | undefined {
  return itens.find((item) => mesmoItem(item, fornecedorId, produtoId, tipoVenda));
}

/**
 * Acrescenta `quantidade` do produto (unidades, ou paletes quando `tipoVenda` = 'palete'),
 * somando ao que já estiver na sacola. Recusa quando o total em unidades passa do estoque,
 * e aí devolve a sacola intacta.
 */
export function adicionarItem(
  itens: CartItem[],
  produto: ProdutoParaSacola,
  fornecedor: FornecedorRef,
  quantidade = 1,
  tipoVenda: TipoVenda = 'unidade',
): ResultadoSacola {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { itens, adicionado: false, motivo: 'Informe uma quantidade maior que zero.' };
  }

  const porPalete = tipoVenda === 'palete';
  const unidadesPorPalete = produto.unidadesPorPalete ?? 0;
  if (porPalete && (!(produto.precoPalete && produto.precoPalete > 0) || unidadesPorPalete <= 0)) {
    return {
      itens,
      adicionado: false,
      motivo: `"${produto.nome}" não é vendido em palete fechado.`,
    };
  }
  if (porPalete && !Number.isInteger(quantidade)) {
    return { itens, adicionado: false, motivo: 'A quantidade de paletes deve ser um número inteiro.' };
  }

  const fator = porPalete ? unidadesPorPalete : 1;
  const existente = encontrarItem(itens, fornecedor.id, produto.id, tipoVenda);
  const quantidadeFinal = (existente?.quantidade ?? 0) + quantidade;
  const disponivel = estoqueDisponivel(produto.estoque);

  // Unidades que o produto já ocupa no outro tipo de venda (ex.: unidades soltas + paletes).
  const outros = itens
    .filter(
      (item) =>
        item.fornecedorId === fornecedor.id &&
        item.produtoId === produto.id &&
        tipoDe(item) !== tipoVenda,
    )
    .reduce((soma, item) => soma + unidadesDoItem(item), 0);

  if (disponivel != null && outros + quantidadeFinal * fator > disponivel) {
    const restante = Math.max(0, disponivel - outros);
    let motivo: string;
    if (disponivel === 0) {
      motivo = `"${produto.nome}" está sem estoque.`;
    } else if (porPalete) {
      const paletes = Math.floor(restante / fator);
      motivo =
        paletes === 0
          ? `Estoque de "${produto.nome}" não completa um palete (${restante} un. disponíveis).`
          : `Cabem no máximo ${paletes} palete(s) de "${produto.nome}".`;
    } else {
      motivo = `Estoque disponível de "${produto.nome}": ${restante}.`;
    }
    return { itens, adicionado: false, motivo };
  }

  if (existente) {
    return {
      adicionado: true,
      itens: itens.map((item) =>
        mesmoItem(item, fornecedor.id, produto.id, tipoVenda)
          ? { ...item, quantidade: quantidadeFinal }
          : item,
      ),
    };
  }

  const novo: CartItem = porPalete
    ? {
        produtoId: produto.id,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
        nome: produto.nome,
        preco: produto.precoPalete as number,
        unidade: `palete (${unidadesPorPalete} un.)`,
        quantidade,
        imagemUrl: produto.imagemUrl,
        tipoVenda: 'palete',
        unidadesPorPalete,
      }
    : {
        produtoId: produto.id,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
        nome: produto.nome,
        preco: produto.precoVenda,
        unidade: produto.unidade,
        quantidade,
        imagemUrl: produto.imagemUrl,
      };

  return { adicionado: true, itens: [...itens, novo] };
}

/** Quantidade zero ou negativa remove o item, como no carrinho do PDV. */
export function alterarQuantidade(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
  quantidade: number,
  tipoVenda: TipoVenda = 'unidade',
): CartItem[] {
  if (quantidade <= 0) {
    return removerItem(itens, fornecedorId, produtoId, tipoVenda);
  }
  return itens.map((item) =>
    mesmoItem(item, fornecedorId, produtoId, tipoVenda) ? { ...item, quantidade } : item,
  );
}

export function removerItem(
  itens: CartItem[],
  fornecedorId: number,
  produtoId: number,
  tipoVenda: TipoVenda = 'unidade',
): CartItem[] {
  return itens.filter((item) => !mesmoItem(item, fornecedorId, produtoId, tipoVenda));
}

export function contarItens(itens: CartItem[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

export function somarTotal(itens: CartItem[]): number {
  return itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}
