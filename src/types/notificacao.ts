/** 'pedido': pedido recebido, só para o fornecedor. As outras são de quem compra. */
export type TipoNotificacao = 'compra' | 'pedido' | 'promocao' | 'oferta' | 'sistema';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  fornecedorId?: number;
  fornecedorNome?: string;
  solicitacaoId?: number;
  criadoEm: string;
}
