/**
 * Pagamento simulado do checkout (demonstração): nenhum dinheiro circula.
 *
 * - Pix: gera o "copia e cola" no padrão BR Code (EMV) com a chave Pix do fornecedor e o valor.
 *   Um app de banco reconhece o formato, mas não use em produção sem um PSP.
 * - Boleto: gera uma linha digitável no layout FEBRABAN (47 dígitos, com os dígitos verificadores),
 *   usando o banco e a conta do fornecedor. Não é registrado em banco nenhum.
 */

// ── Pix (BR Code) ─────────────────────────────────────────────────────────────

function campoEmv(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no fim do BR Code. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Tira acentos e caracteres fora do permitido; o BR Code aceita só ASCII simples. */
function textoEmv(texto: string, max: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max) || 'NA';
}

/** Chave no formato que o Pix espera: telefone com +55, CPF/CNPJ só dígitos. */
export function normalizarChavePix(tipo: string | null | undefined, chave: string): string {
  const limpa = chave.trim();
  if (tipo === 'cpf' || tipo === 'cnpj') return limpa.replace(/\D/g, '');
  if (tipo === 'telefone') {
    const digitos = limpa.replace(/\D/g, '');
    return digitos.startsWith('55') && digitos.length > 11 ? `+${digitos}` : `+55${digitos}`;
  }
  if (tipo === 'email') return limpa.toLowerCase();
  return limpa;
}

export interface DadosPix {
  chave: string;
  tipoChave?: string | null;
  nomeRecebedor: string;
  cidade?: string;
  valor: number;
  /** Identificador da cobrança (até 25 letras/números). */
  txid?: string;
}

export function gerarPixCopiaECola({ chave, tipoChave, nomeRecebedor, cidade = 'SAO PAULO', valor, txid = '***' }: DadosPix): string {
  const conta = campoEmv('00', 'br.gov.bcb.pix') + campoEmv('01', normalizarChavePix(tipoChave, chave));
  const id = txid === '***' ? txid : txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const semCrc =
    campoEmv('00', '01') +
    campoEmv('26', conta) +
    campoEmv('52', '0000') +
    campoEmv('53', '986') +
    campoEmv('54', valor.toFixed(2)) +
    campoEmv('58', 'BR') +
    campoEmv('59', textoEmv(nomeRecebedor, 25)) +
    campoEmv('60', textoEmv(cidade, 15)) +
    campoEmv('62', campoEmv('05', id)) +
    '6304';
  return semCrc + crc16(semCrc);
}

// ── Boleto (linha digitável FEBRABAN) ───────────────────────────────────────

/** Módulo 10 dos campos da linha digitável. */
export function modulo10(numero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    const produto = Number(numero[i]) * peso;
    soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

/** Módulo 11 do código de barras (pesos 2 a 9); resto 0, 1 ou 10 vira 1. */
export function modulo11Boleto(numero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const dv = 11 - (soma % 11);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/**
 * Fator de vencimento: dias desde 07/10/1997. Ao passar de 9999 (22/02/2025) recomeça em 1000,
 * conforme a regra da FEBRABAN.
 */
export function fatorVencimento(vencimento: Date): string {
  const base = Date.UTC(1997, 9, 7);
  const dia = Date.UTC(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  const dias = Math.round((dia - base) / 86_400_000);
  const fator = dias <= 9999 ? dias : ((dias - 1000) % 9000) + 1000;
  return String(fator).padStart(4, '0');
}

export interface DadosBoleto {
  bancoCodigo: string;
  agencia: string;
  conta: string;
  valor: number;
  vencimento: Date;
  /** Número do documento (ex.: id do pedido ou um contador). */
  nossoNumero: number | string;
}

export interface BoletoGerado {
  codigoBarras: string;
  linhaDigitavel: string;
}

export function gerarBoleto({ bancoCodigo, agencia, conta, valor, vencimento, nossoNumero }: DadosBoleto): BoletoGerado {
  const banco = bancoCodigo.replace(/\D/g, '').padStart(3, '0').slice(-3);
  const so = (v: string | number) => String(v).replace(/\D/g, '');
  // Campo livre (25 dígitos): agência (4) + conta (8) + nosso número (13).
  const campoLivre = (
    so(agencia).padStart(4, '0').slice(-4) +
    so(conta).padStart(8, '0').slice(-8) +
    so(nossoNumero).padStart(13, '0').slice(-13)
  );
  const fator = fatorVencimento(vencimento);
  const valorCentavos = String(Math.round(valor * 100)).padStart(10, '0').slice(-10);

  const semDv = `${banco}9${fator}${valorCentavos}${campoLivre}`;
  const dv = modulo11Boleto(semDv);
  const codigoBarras = `${banco}9${dv}${fator}${valorCentavos}${campoLivre}`;

  const c1 = `${banco}9${campoLivre.slice(0, 5)}`;
  const c2 = campoLivre.slice(5, 15);
  const c3 = campoLivre.slice(15, 25);
  const campo1 = `${c1}${modulo10(c1)}`;
  const campo2 = `${c2}${modulo10(c2)}`;
  const campo3 = `${c3}${modulo10(c3)}`;
  const linhaDigitavel =
    `${campo1.slice(0, 5)}.${campo1.slice(5)} ` +
    `${campo2.slice(0, 5)}.${campo2.slice(5)} ` +
    `${campo3.slice(0, 5)}.${campo3.slice(5)} ` +
    `${dv} ${fator}${valorCentavos}`;

  return { codigoBarras, linhaDigitavel };
}

/** Vencimento padrão do boleto de demonstração: daqui a 3 dias. */
export function vencimentoPadrao(hoje = new Date()): Date {
  const d = new Date(hoje);
  d.setDate(d.getDate() + 3);
  return d;
}

export function formatarData(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}
