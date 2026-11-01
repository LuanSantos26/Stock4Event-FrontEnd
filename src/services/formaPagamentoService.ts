import { API_BASE_URL } from '../config/api';
import { apiFetch, extractErrorMessage, parseResponse } from './http';
import type {
  TipoPagamento,
  FormaPagamentoSalva,
  FormaPagamentoPayload,
} from '../types/pagamento';

export type { TipoPagamento, FormaPagamentoSalva, FormaPagamentoPayload };

export function labelTipoPagamento(tipo: string): string {
  switch (tipo) {
    case 'pix':
      return 'PIX';
    case 'credito':
      return 'Crédito';
    case 'debito':
      return 'Débito';
    case 'boleto':
      return 'Boleto';
    case 'dinheiro':
      return 'Dinheiro';
    default:
      return tipo;
  }
}

export function iconeTipoPagamento(
  tipo: string,
): 'phone-portrait-outline' | 'card-outline' | 'card' | 'cash-outline' | 'barcode-outline' {
  switch (tipo) {
    case 'boleto':
      return 'barcode-outline';
    case 'pix':
      return 'phone-portrait-outline';
    case 'credito':
      return 'card-outline';
    case 'debito':
      return 'card';
    default:
      return 'cash-outline';
  }
}

export async function listarFormasPagamento(empresaId: number): Promise<FormaPagamentoSalva[]> {
  const response = await apiFetch(`/api/formas-pagamento?empresaId=${empresaId}`);
  return parseResponse<FormaPagamentoSalva[]>(
    response,
    'Não foi possível carregar formas de pagamento.',
    { treatOutdatedServer: true },
  );
}

export async function criarFormaPagamento(payload: FormaPagamentoPayload): Promise<FormaPagamentoSalva> {
  let response: Response;
  try {
    response = await apiFetch(`/api/formas-pagamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Não foi possível conectar ao servidor (${API_BASE_URL}). Verifique se o backend está rodando.`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(data, 'Não foi possível salvar a forma de pagamento.', {
        treatOutdatedServer: true,
      }),
    );
  }

  return data as FormaPagamentoSalva;
}

export async function removerFormaPagamento(id: number, empresaId: number): Promise<void> {
  const response = await apiFetch(`/api/formas-pagamento/${id}?empresaId=${empresaId}`,
    { method: 'DELETE' },
  );

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(data, 'Não foi possível remover a forma de pagamento.', {
        treatOutdatedServer: true,
      }),
    );
  }
}

export async function definirFormaPagamentoPrincipal(
  id: number,
  empresaId: number,
): Promise<FormaPagamentoSalva> {
  const response = await apiFetch(`/api/formas-pagamento/${id}/principal?empresaId=${empresaId}`,
    { method: 'PATCH' },
  );
  return parseResponse<FormaPagamentoSalva>(
    response,
    'Não foi possível definir a forma de pagamento principal.',
    { treatOutdatedServer: true },
  );
}
