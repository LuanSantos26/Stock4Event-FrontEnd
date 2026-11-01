export type TipoConta = 'corrente' | 'poupanca';
export type TipoChaveRecebimento = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

/** Conta onde o fornecedor recebe os pagamentos. Formato da API GET /api/dados-bancarios. */
export interface DadosBancarios {
  empresaId: number;
  empresaNome: string;
  bancoCodigo: string;
  bancoNome: string;
  agencia: string;
  conta: string;
  tipoConta: TipoConta;
  titular: string;
  documento: string;
  tipoChavePix?: TipoChaveRecebimento | null;
  chavePix?: string | null;
}

export interface DadosBancariosPayload {
  empresaId: number;
  bancoCodigo: string;
  bancoNome: string;
  agencia: string;
  conta: string;
  tipoConta: TipoConta;
  titular: string;
  documento: string;
  tipoChavePix?: TipoChaveRecebimento | null;
  chavePix?: string | null;
}
