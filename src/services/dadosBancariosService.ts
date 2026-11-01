import { apiFetch, NETWORK_ERROR_MESSAGE, parseResponse } from './http';
import type { DadosBancarios, DadosBancariosPayload } from '../types/dadosBancarios';

export type { DadosBancarios, DadosBancariosPayload };

/** Bancos mais usados, para escolher com um toque (o fornecedor também pode digitar outro). */
export const BANCOS_COMUNS: { codigo: string; nome: string }[] = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '341', nome: 'Itaú' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '260', nome: 'Nubank' },
  { codigo: '077', nome: 'Banco Inter' },
  { codigo: '336', nome: 'C6 Bank' },
];

/** Conta de recebimento de uma empresa, ou null se ainda não cadastrou (a API responde 204). */
export async function buscarDadosBancarios(empresaId: number): Promise<DadosBancarios | null> {
  let response: Response;
  try {
    response = await apiFetch(`/api/dados-bancarios?empresaId=${empresaId}`);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
  if (response.status === 204 || response.status === 404) return null;
  return parseResponse<DadosBancarios>(response, 'Não foi possível carregar os dados bancários.');
}

export async function salvarDadosBancarios(payload: DadosBancariosPayload): Promise<DadosBancarios> {
  let response: Response;
  try {
    response = await apiFetch('/api/dados-bancarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
  return parseResponse<DadosBancarios>(response, 'Não foi possível salvar os dados bancários.', {
    treatOutdatedServer: true,
  });
}

export function labelTipoConta(tipo: string): string {
  return tipo === 'poupanca' ? 'Poupança' : 'Conta corrente';
}

/** "Banco do Brasil (001) · Ag. 1234 · CC 12345-6" */
export function resumoConta(dados: DadosBancarios): string {
  const sigla = dados.tipoConta === 'poupanca' ? 'CP' : 'CC';
  return `${dados.bancoNome} (${dados.bancoCodigo}) · Ag. ${dados.agencia} · ${sigla} ${dados.conta}`;
}

/** Documento com parte escondida, para mostrar ao cliente: ***.456.789-** ou 12.345.678/****-95 */
export function documentoMascarado(documento: string): string {
  const d = documento.replace(/\D/g, '');
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/****-${d.slice(12)}`;
  return d;
}
