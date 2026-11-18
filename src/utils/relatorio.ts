import type { PeriodoRelatorio, Relatorio } from '../services/relatorioService';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dois(n: number): string {
  return String(n).padStart(2, '0');
}

/** 2026-11-18, na data local (não em UTC). */
export function dataISO(data: Date): string {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

/** Anda um dia, um mês ou um ano para trás (delta < 0) ou para a frente. */
export function deslocarData(data: Date, periodo: PeriodoRelatorio, delta: number): Date {
  if (periodo === 'dia') {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate() + delta);
  }
  if (periodo === 'mes') {
    return new Date(data.getFullYear(), data.getMonth() + delta, 1);
  }
  return new Date(data.getFullYear() + delta, 0, 1);
}

/** "18/11/2026", "Novembro de 2026" ou "2026". */
export function rotuloPeriodo(data: Date, periodo: PeriodoRelatorio): string {
  if (periodo === 'dia') return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()}`;
  if (periodo === 'mes') {
    const mes = MESES[data.getMonth()];
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${data.getFullYear()}`;
  }
  return String(data.getFullYear());
}

/** Se o período já chegou ao fim do que existe (não dá para ir para o futuro). */
export function ehPeriodoAtualOuFuturo(data: Date, periodo: PeriodoRelatorio, hoje = new Date()): boolean {
  const proximo = deslocarData(data, periodo, 1);
  const inicioProximo = new Date(proximo.getFullYear(), proximo.getMonth(), proximo.getDate());
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (periodo === 'dia') return inicioProximo > inicioHoje;
  if (periodo === 'mes') return new Date(proximo.getFullYear(), proximo.getMonth(), 1) > inicioHoje;
  return new Date(proximo.getFullYear(), 0, 1) > inicioHoje;
}

export function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

/** 18/11/2026 14:05, a partir do "2026-11-18T14:05:31" do servidor (sem mexer no fuso). */
export function dataHoraCurta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '');
  if (!m) return iso ?? '';
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

function esc(texto: string | null | undefined): string {
  return (texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const PAGAMENTO: Record<string, string> = {
  pix: 'PIX', credito: 'Crédito', debito: 'Débito', boleto: 'Boleto', dinheiro: 'Dinheiro',
};

/** relatorio-vendas-mes-2026-11.pdf */
export function nomeArquivo(rel: Pick<Relatorio, 'perfil' | 'periodo' | 'inicio'>, extensao: 'pdf' | 'csv'): string {
  const tipo = rel.perfil === 'fornecedor' ? 'vendas' : 'compras';
  const ref = rel.periodo === 'dia' ? rel.inicio : rel.periodo === 'mes' ? rel.inicio.slice(0, 7) : rel.inicio.slice(0, 4);
  return `relatorio-${tipo}-${rel.periodo}-${ref}.${extensao}`;
}

/** Página A4 do relatório, para imprimir ou salvar em PDF. */
export function gerarHtmlRelatorio(rel: Relatorio): string {
  const fornecedor = rel.perfil === 'fornecedor';
  const contraparte = fornecedor ? 'Cliente' : 'Distribuidora';
  const cor = fornecedor ? '#092D5E' : '#C98912';
  const produtos = rel.produtos.length
    ? rel.produtos.map((p) => `<tr><td>${esc(p.nome)}</td><td class="n">${numero(p.unidades)}</td><td class="n">${moeda(p.valor)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="vazio">Nenhum produto no período.</td></tr>';
  const contrapartes = rel.contrapartes.length
    ? rel.contrapartes.map((c) => `<tr><td>${esc(c.nome)}</td><td class="n">${c.pedidos}</td><td class="n">${moeda(c.valor)}</td></tr>`).join('')
    : `<tr><td colspan="3" class="vazio">Nenhum ${contraparte.toLowerCase()} no período.</td></tr>`;
  const pedidos = rel.pedidos.length
    ? rel.pedidos.map((p) => `<tr${p.status === 'cancelada' ? ' class="cancelado"' : ''}>
        <td>#${p.id}</td><td>${esc(dataHoraCurta(p.criadoEm))}</td><td>${esc(p.contraparte)}</td>
        <td>${p.tipoEntrega === 'retirada' ? 'Retirada' : 'Entrega'}</td><td>${esc(p.statusLabel)}</td>
        <td>${esc(PAGAMENTO[p.metodoPagamento ?? ''] ?? p.metodoPagamento ?? '')}</td><td class="n">${moeda(p.valor)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="vazio">Nenhum pedido no período.</td></tr>';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(rel.titulo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1F2937; font-size: 11px; margin: 0; }
  header { border-bottom: 3px solid ${cor}; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 20px; margin: 0; color: ${cor}; }
  .sub { color: #6B7280; margin-top: 4px; }
  .cards { display: flex; gap: 8px; margin-bottom: 14px; }
  .card { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 10px; }
  .card b { display: block; font-size: 15px; color: ${cor}; margin-top: 2px; }
  .card span { color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; }
  h2 { font-size: 13px; margin: 16px 0 6px; color: ${cor}; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #F3F4F6; padding: 5px 6px; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 6px; border-bottom: 1px solid #F0F0F0; }
  .n { text-align: right; white-space: nowrap; }
  .vazio { color: #9CA3AF; text-align: center; padding: 10px; }
  .cancelado td { color: #9CA3AF; text-decoration: line-through; }
  footer { margin-top: 18px; color: #9CA3AF; font-size: 9px; text-align: center; }
</style></head><body>
  <header>
    <h1>${esc(rel.titulo)}</h1>
    <div class="sub">${esc(rel.empresaNome)} · Gerado em ${esc(dataHoraCurta(rel.geradoEm))}</div>
  </header>
  <div class="cards">
    <div class="card"><span>Pedidos</span><b>${rel.totalPedidos}</b></div>
    <div class="card"><span>${fornecedor ? 'Faturamento' : 'Total gasto'}</span><b>${moeda(rel.valorTotal)}</b></div>
    <div class="card"><span>Ticket médio</span><b>${moeda(rel.ticketMedio)}</b></div>
    <div class="card"><span>Unidades</span><b>${numero(rel.unidades)}</b></div>
  </div>
  <div class="cards">
    <div class="card"><span>Concluídos</span><b>${rel.concluidos}</b></div>
    <div class="card"><span>Em andamento</span><b>${rel.emAndamento}</b></div>
    <div class="card"><span>Cancelados</span><b>${rel.cancelados}</b></div>
    <div class="card"><span>Valor concluído</span><b>${moeda(rel.valorConcluido)}</b></div>
  </div>
  <h2>Produtos</h2>
  <table><tr><th>Produto</th><th class="n">Unidades</th><th class="n">Valor</th></tr>${produtos}</table>
  <h2>${fornecedor ? 'Clientes' : 'Distribuidoras'}</h2>
  <table><tr><th>${contraparte}</th><th class="n">Pedidos</th><th class="n">Valor</th></tr>${contrapartes}</table>
  <h2>Pedidos</h2>
  <table><tr><th>Nº</th><th>Data</th><th>${contraparte}</th><th>Tipo</th><th>Status</th><th>Pagamento</th><th class="n">Valor</th></tr>${pedidos}</table>
  <footer>Stock4event · Valores sem os pedidos cancelados · Relatório sem valor fiscal</footer>
</body></html>`;
}

function celulaCsv(valor: string | number): string {
  const texto = typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : valor;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV com ";" e vírgula decimal, que o Excel em português abre direto. Uma linha por pedido. */
export function gerarCsvRelatorio(rel: Relatorio): string {
  const contraparte = rel.perfil === 'fornecedor' ? 'Cliente' : 'Distribuidora';
  const linhas: (string | number)[][] = [
    ['Pedido', 'Data', contraparte, 'Tipo', 'Status', 'Pagamento', 'Valor (R$)'],
    ...rel.pedidos.map((p) => [
      `#${p.id}`,
      dataHoraCurta(p.criadoEm),
      p.contraparte,
      p.tipoEntrega === 'retirada' ? 'Retirada' : 'Entrega',
      p.statusLabel,
      PAGAMENTO[p.metodoPagamento ?? ''] ?? p.metodoPagamento ?? '',
      p.valor,
    ]),
    [],
    ['Total (sem cancelados)', '', '', '', '', '', rel.valorTotal],
  ];
  return linhas.map((l) => l.map(celulaCsv).join(';')).join('\r\n');
}
