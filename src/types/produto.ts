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
  empresaId: number;
}
