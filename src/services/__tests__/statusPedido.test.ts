import {
  labelStatusPedido,
  obterPrevisaoEntrega,
  calcularProgressoPedido,
  type SolicitacaoCompra,
  type EtapaPedido,
} from '../marketplaceService';

/** Pedido mínimo: só o que estas funções leem. */
function pedido(status: string, etapas?: EtapaPedido[]): SolicitacaoCompra {
  return { status, etapas } as unknown as SolicitacaoCompra;
}

/** Monta as 4 etapas como o backend monta, com a etapa `ativa` na posição indicada. */
function etapasCom(indiceAtivo: number): EtapaPedido[] {
  const defs = [
    ['recebido', 'Pedido recebido'],
    ['preparando', 'Preparando pedido'],
    ['em_rota', 'Pedido saiu para a entrega'],
    ['entregue', 'Entregue'],
  ];
  return defs.map(([codigo, label], i) => ({
    codigo,
    label,
    ordem: i + 1,
    concluida: i < indiceAtivo,
    ativa: i === indiceAtivo,
  }));
}

describe('labelStatusPedido', () => {
  it('traz as quatro etapas do pedido', () => {
    expect(labelStatusPedido('recebido')).toBe('Pedido recebido');
    expect(labelStatusPedido('preparando')).toBe('Preparando pedido');
    expect(labelStatusPedido('em_rota')).toBe('Pedido saiu para a entrega');
    expect(labelStatusPedido('entregue')).toBe('Entregue');
  });

  it('trata cancelamento e status desconhecido', () => {
    expect(labelStatusPedido('cancelada')).toBe('Pedido cancelado');
    expect(labelStatusPedido('status_que_nao_existe')).toBe('Pedido em andamento');
  });

  it('não devolve mais o rótulo antigo para o status removido', () => {
    expect(labelStatusPedido('aguardando_liberacao')).toBe('Pedido em andamento');
  });
});

describe('obterPrevisaoEntrega', () => {
  it('usa o texto que o servidor mandou, quando existe', () => {
    const p = { status: 'em_rota', previsaoEntregaLabel: 'Chegada em até 9 min' };
    expect(obterPrevisaoEntrega(p as unknown as SolicitacaoCompra)).toBe('Chegada em até 9 min');
  });

  it('cai no texto local quando o servidor não manda', () => {
    expect(obterPrevisaoEntrega(pedido('entregue'))).toBe('Pedido entregue');
    expect(obterPrevisaoEntrega(pedido('cancelada'))).toBe('Pedido cancelado');
    expect(obterPrevisaoEntrega(pedido('recebido'))).toBe('Previsão de entrega: 40–55 min');
  });
});

describe('calcularProgressoPedido', () => {
  it('avança um quarto a cada etapa concluída', () => {
    expect(calcularProgressoPedido(pedido('recebido', etapasCom(0)))).toBe(0);
    expect(calcularProgressoPedido(pedido('preparando', etapasCom(1)))).toBe(0.25);
    expect(calcularProgressoPedido(pedido('em_rota', etapasCom(2)))).toBe(0.5);
  });

  it('chega a 100% quando todas as etapas estão concluídas', () => {
    const todasConcluidas = etapasCom(-1).map((e) => ({ ...e, concluida: true, ativa: false }));
    expect(calcularProgressoPedido(pedido('entregue', todasConcluidas))).toBe(1);
  });

  it('estima pelo status quando o servidor não manda as etapas', () => {
    expect(calcularProgressoPedido(pedido('recebido'))).toBe(0.25);
    expect(calcularProgressoPedido(pedido('preparando'))).toBe(0.5);
    expect(calcularProgressoPedido(pedido('em_rota'))).toBe(0.75);
    expect(calcularProgressoPedido(pedido('entregue'))).toBe(1);
  });
});
