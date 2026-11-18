export interface Produto {
  id: number;
  empresaId: number;
  codigo?: string;
  codigoOrigem?: string;
  /** Código de barras (EAN/GTIN), usado no PDV. */
  codigoBarras?: string | null;
  nome: string;
  precoVenda: number;
  unidade: string;
  descricao?: string;
  imagemUrl?: string;
  ativo: number;
  estoque?: number;
  /** Preço do palete fechado. Vazio: o produto só é vendido por unidade. */
  precoPalete?: number | null;
  /** Quantas unidades vêm em um palete fechado. */
  unidadesPorPalete?: number | null;
}

export interface ProdutoPayload {
  nome: string;
  precoVenda: number;
  unidade: string;
  descricao?: string;
  imagemUrl?: string;
  estoque?: number;
  /** Vazio: o servidor gera um código interno. */
  codigoBarras?: string;
  /** Preço do palete fechado (opcional). */
  precoPalete?: number | null;
  /** Unidades por palete fechado (opcional). */
  unidadesPorPalete?: number | null;
  empresaId: number;
}
