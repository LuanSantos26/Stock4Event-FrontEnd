import type { TipoChavePix } from '../utils/pixUtils';

export type TipoPagamento = 'pix' | 'credito' | 'debito' | 'boleto' | 'dinheiro';

/** Alias usado nas solicitações de compra — mesmos valores da API. */
export type MetodoPagamento = TipoPagamento;

export type TipoCartao = 'credito' | 'debito';

export interface FormaPagamentoSalva {
  id: number;
  empresaId: number;
  tipo: TipoPagamento;
  apelido: string;
  label: string;
  principal: boolean;
}

export interface FormaPagamentoPayload {
  empresaId: number;
  tipo: TipoPagamento;
  apelido: string;
  principal?: boolean;
}

export interface CartaoSalvo {
  id: number;
  empresaId: number;
  apelido: string | null;
  tipo: TipoCartao;
  bandeira: string;
  ultimosDigitos: string;
  numeroMascarado: string;
  validade: string;
  titular: string;
}

export interface CartaoSalvoPayload {
  empresaId: number;
  apelido?: string;
  tipo: TipoCartao;
  bandeira: string;
  ultimosDigitos: string;
  validade: string;
  titular: string;
}

export interface PixSalvo {
  id: number;
  empresaId: number;
  apelido: string;
  tipoChave: TipoChavePix;
  chaveMascarada: string;
  ultimosDigitos: string;
}

export interface PixSalvoPayload {
  empresaId: number;
  apelido: string;
  tipoChave: TipoChavePix;
  chaveMascarada: string;
  ultimosDigitos: string;
}
