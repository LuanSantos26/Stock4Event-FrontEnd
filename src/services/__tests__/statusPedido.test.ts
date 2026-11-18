import {
  labelStatusPedido,
  obterPrevisaoEntrega,
  calcularProgressoPedido,
  proximaEtapaFornecedor,
  aguardandoConclusaoCliente,
  labelAcaoCliente,
  descreverQuantidadeItem,
  type SolicitacaoCompra,
  type EtapaPedido,
  type ItemSolicitacao,
} from '../marketplaceService';

/** Pedido mínimo: só o que estas funções leem. */
function pedido(
  status: string,
  etapas?: EtapaPedido[],
  tipoEntrega: 'entrega' | 'retirada' = 'entrega',
): SolicitacaoCompra {
  return { status, etapas, tipoEntrega } as unknown as SolicitacaoCompra;
}

/** Monta as 5 etapas da entrega como o backend monta, com a etapa `ativa` na posição indicada. */
function etapasCom(indiceAtivo: number): EtapaPedido[] {
  const defs = [
    ['pedido_efetuado', 'Pedido confirmado'],
    ['em_separacao', 'Produto em separação'],
    ['abastecendo', 'Abastecendo o carro'],
    ['em_rota', 'A caminho / em rota'],
    ['entregue', 'Entrega concluída'],
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
  it('traz as etapas da logística', () => {
    expect(labelStatusPedido('aguardando_liberacao')).toBe('Pedido recebido');
    expect(labelStatusPedido('em_separacao')).toBe('Produto em separação');
    expect(labelStatusPedido('abastecendo')).toBe('Abastecendo o carro');
    expect(labelStatusPedido('em_rota')).toBe('A caminho, em rota');
    expect(labelStatusPedido('entregue')).toBe('Entrega concluída');
  });

  it('usa os textos da retirada no local', () => {
    expect(labelStatusPedido('pronto_retirada', 'retirada')).toBe('Pronto para retirada');
    expect(labelStatusPedido('entregue', 'retirada')).toBe('Retirada concluída');
  });

  it('trata cancelamento e status desconhecido', () => {
    expect(labelStatusPedido('cancelada')).toBe('Pedido cancelado');
    expect(labelStatusPedido('status_que_nao_existe')).toBe('Pedido em andamento');
  });
});

describe('proximaEtapaFornecedor', () => {
  it('segue separação → carro → rota na entrega, e para aí', () => {
    expect(proximaEtapaFornecedor(pedido('aguardando_liberacao'))).toBe('em_separacao');
    expect(proximaEtapaFornecedor(pedido('em_separacao'))).toBe('abastecendo');
    expect(proximaEtapaFornecedor(pedido('abastecendo'))).toBe('em_rota');
    // "entregue" é do cliente: o fornecedor não tem próxima etapa depois da rota.
    expect(proximaEtapaFornecedor(pedido('em_rota'))).toBeNull();
    expect(proximaEtapaFornecedor(pedido('entregue'))).toBeNull();
  });

  it('pula o carro e a rota na retirada no local, e para no pronto', () => {
    expect(proximaEtapaFornecedor(pedido('em_separacao', undefined, 'retirada'))).toBe('pronto_retirada');
    expect(proximaEtapaFornecedor(pedido('pronto_retirada', undefined, 'retirada'))).toBeNull();
  });

  it('não avança pedido cancelado', () => {
    expect(proximaEtapaFornecedor(pedido('cancelada'))).toBeNull();
  });
});

describe('conclusão pelo cliente', () => {
  it('espera o cliente quando o pedido está em rota ou pronto para retirada', () => {
    expect(aguardandoConclusaoCliente(pedido('em_rota'))).toBe(true);
    expect(aguardandoConclusaoCliente(pedido('pronto_retirada', undefined, 'retirada'))).toBe(true);
  });

  it('não espera nas outras etapas', () => {
    expect(aguardandoConclusaoCliente(pedido('abastecendo'))).toBe(false);
    expect(aguardandoConclusaoCliente(pedido('em_separacao', undefined, 'retirada'))).toBe(false);
    expect(aguardandoConclusaoCliente(pedido('entregue'))).toBe(false);
    expect(aguardandoConclusaoCliente(pedido('cancelada'))).toBe(false);
  });

  it('dá o texto certo para o botão do cliente', () => {
    expect(labelAcaoCliente(false)).toBe('Concluir entrega');
    expect(labelAcaoCliente(true)).toBe('Concluir retirada');
  });
});

describe('obterPrevisaoEntrega', () => {
  it('usa o texto que o servidor mandou, quando existe', () => {
    const p = { status: 'em_rota', previsaoEntregaLabel: 'Chegada em até 9 min' };
    expect(obterPrevisaoEntrega(p as unknown as SolicitacaoCompra)).toBe('Chegada em até 9 min');
  });

  it('cai no texto local quando o servidor não manda', () => {
    expect(obterPrevisaoEntrega(pedido('entregue'))).toBe('Entrega concluída');
    expect(obterPrevisaoEntrega(pedido('cancelada'))).toBe('Pedido cancelado');
    expect(obterPrevisaoEntrega(pedido('em_separacao'))).toBe('Previsão de entrega: 40–55 min');
    expect(obterPrevisaoEntrega(pedido('pronto_retirada', undefined, 'retirada'))).toBe(
      'Pronto! Retire no local e toque em Concluir retirada',
    );
  });
});

describe('calcularProgressoPedido', () => {
  it('avança um quinto a cada etapa concluída', () => {
    expect(calcularProgressoPedido(pedido('em_separacao', etapasCom(1)))).toBeCloseTo(0.2);
    expect(calcularProgressoPedido(pedido('em_rota', etapasCom(3)))).toBeCloseTo(0.6);
  });

  it('chega a 100% quando todas as etapas estão concluídas', () => {
    const todasConcluidas = etapasCom(-1).map((e) => ({ ...e, concluida: true, ativa: false }));
    expect(calcularProgressoPedido(pedido('entregue', todasConcluidas))).toBe(1);
  });

  it('estima pelo status quando o servidor não manda as etapas', () => {
    expect(calcularProgressoPedido(pedido('aguardando_liberacao'))).toBeCloseTo(0.2);
    expect(calcularProgressoPedido(pedido('em_rota'))).toBeCloseTo(0.8);
    expect(calcularProgressoPedido(pedido('entregue'))).toBe(1);
    expect(calcularProgressoPedido(pedido('pronto_retirada', undefined, 'retirada'))).toBeCloseTo(0.75);
  });
});

describe('descreverQuantidadeItem', () => {
  it('mostra paletes e o total de unidades', () => {
    const item = { quantidade: 48, unidade: 'UN', tipoVenda: 'palete', quantidadePaletes: 2 };
    expect(descreverQuantidadeItem(item as unknown as ItemSolicitacao)).toBe('2 paletes (48 un.)');
  });

  it('mostra só a quantidade quando é por unidade', () => {
    const item = { quantidade: 5, unidade: 'UN', tipoVenda: 'unidade' };
    expect(descreverQuantidadeItem(item as unknown as ItemSolicitacao)).toBe('5 UN');
  });
});
