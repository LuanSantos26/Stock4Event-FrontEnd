import type { MetodoPagamento } from './pagamento';

export interface Fornecedor {
  id: number;
  nome: string;
  descricao?: string;
  tipo: string;
  totalProdutos: number;
  logoUrl?: string;
  capaUrl?: string;
}

/** Como o item foi vendido: por unidade ou em palete fechado. */
export type TipoVenda = 'unidade' | 'palete';

/** Entrega no endereço do comprador ou retirada no local do fornecedor. */
export type TipoEntrega = 'entrega' | 'retirada';

export interface ItemSolicitacao {
  produtoId: number;
  nome: string;
  unidade: string;
  /** Sempre em unidades (é o que sai do estoque). */
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  imagemUrl?: string;
  tipoVenda?: TipoVenda;
  /** Quantos paletes, quando tipoVenda = 'palete'. */
  quantidadePaletes?: number | null;
  precoPalete?: number | null;
  unidadesPorPalete?: number | null;
}

export interface EtapaPedido {
  codigo: string;
  label: string;
  ordem: number;
  concluida: boolean;
  ativa: boolean;
}

export interface SolicitacaoCompra {
  id: number;
  pedidoId?: number;
  fornecedorId: number;
  fornecedorNome: string;
  compradorId?: number;
  compradorNome?: string;
  status: string;
  statusLabel?: string;
  etapas?: EtapaPedido[];
  valorTotal: number;
  observacao?: string;
  metodoPagamento?: string;
  enderecoResumo?: string;
  taxaEntrega?: number;
  tipoEntrega?: TipoEntrega;
  criadoEm: string;
  itens: ItemSolicitacao[];
  previsaoEntregaMinutos?: number;
  previsaoEntregaLabel?: string;
}

export interface ItemSolicitacaoPayload {
  produtoId: number;
  /** Em unidades, ou em número de paletes quando tipoVenda = 'palete'. */
  quantidade: number;
  tipoVenda?: TipoVenda;
}

export interface SolicitacaoCompraPayload {
  empresaCompradoraId: number;
  empresaFornecedoraId: number;
  usuarioId: number;
  observacao?: string;
  metodoPagamento: MetodoPagamento;
  /** Obrigatório na entrega; na retirada fica vazio. */
  enderecoEntregaId?: number;
  tipoEntrega?: TipoEntrega;
  taxaEntrega?: number;
  pagamentoReferencia?: string;
  pagamentoDetalhes?: string;
  itens: ItemSolicitacaoPayload[];
}

export interface CartItem {
  produtoId: number;
  fornecedorId: number;
  fornecedorNome: string;
  nome: string;
  preco: number;
  unidade: string;
  quantidade: number;
  imagemUrl?: string;
  /** 'palete': `preco` é o preço do palete e `quantidade` conta paletes. */
  tipoVenda?: TipoVenda;
  /** Unidades em um palete (só em itens por palete). */
  unidadesPorPalete?: number;
}

export interface StoredPurchaseCart {
  itens: CartItem[];
}

/** Produto cadastrado por uma distribuidora (vitrine "Adicionados pelos fornecedores"). */
export interface ProdutoRecente {
  id: number;
  empresaId: number;
  nome: string;
  precoVenda: number;
  unidade: string;
  descricao?: string;
  imagemUrl?: string;
  ativo: number;
  estoque?: number;
  codigo?: string;
  precoPalete?: number | null;
  unidadesPorPalete?: number | null;
  fornecedorNome: string;
  fornecedorLogoUrl?: string | null;
  fornecedorCapaUrl?: string | null;
  fornecedorDescricao?: string | null;
  fornecedorTipo?: string | null;
  criadoEm?: string | null;
  /** Produto da própria empresa: aparece na vitrine, mas não dá para comprar de si mesmo. */
  proprio?: boolean;
}

/** Quiosque de outra empresa (vitrine "Quiosques disponíveis"). */
export interface QuiosqueDisponivel {
  id: number;
  nome: string;
  eventoNome: string;
  dataInicio?: string | null;
  dataFim?: string | null;
  empresaId: number;
  empresaNome: string;
  empresaTipo?: string | null;
  empresaDescricao?: string | null;
  empresaLogoUrl?: string | null;
  empresaCapaUrl?: string | null;
  /** A dona também vende no marketplace: dá para abrir a loja dela. */
  distribuidora: boolean;
  totalProdutos: number;
  produtosDisponiveis: number;
  produtos: {
    produtoId: number;
    nome: string;
    unidade: string;
    precoVenda: number;
    imagemUrl?: string | null;
    disponivel: boolean;
  }[];
}
