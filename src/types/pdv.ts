export type FormaPagamentoPdv = 'pix' | 'credito' | 'debito' | 'dinheiro';

/** Produto vendável no ponto de venda (quiosque), com o preço do cadastro. */
export interface ProdutoPdv {
  id: number;
  codigo: string;
  /** Código de barras (EAN/GTIN) para leitura no caixa. */
  codigoBarras?: string | null;
  nome: string;
  unidade: string;
  precoVenda: number;
  imagemUrl?: string | null;
  /** Menor valor entre o estoque do quiosque e o estoque total do produto. */
  disponivel: number;
}

export interface ItemCarrinhoPdv {
  produtoId: number;
  codigo: string;
  nome: string;
  unidade: string;
  /** Só para exibição; o backend usa o preço cadastrado. */
  precoUnitario: number;
  quantidade: number;
  disponivel: number;
}

/** Corpo de POST /api/pdv/vendas: sem preços nem total (o servidor calcula). */
export interface VendaPdvPayload {
  barracaId: number;
  chaveVenda: string;
  formaPagamento: FormaPagamentoPdv;
  valorRecebido?: number;
  clienteNome?: string;
  clienteDocumento?: string;
  itens: { produtoId: number; quantidade: number }[];
}

export interface ItemVendaPdv {
  produtoId: number;
  codigo: string;
  nome: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface VendaPdv {
  id: number;
  numero: string;
  criadoEm: string;
  status: string;
  barracaId: number;
  barracaNome: string;
  operadorNome: string;
  empresaNome: string;
  empresaCnpj: string;
  formaPagamento: FormaPagamentoPdv;
  total: number;
  valorRecebido?: number | null;
  troco?: number | null;
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  itens: ItemVendaPdv[];
}
