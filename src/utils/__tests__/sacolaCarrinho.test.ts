import {
  adicionarItem,
  alterarQuantidade,
  contarItens,
  encontrarItem,
  estoqueDisponivel,
  removerItem,
  somarTotal,
  type ProdutoParaSacola,
} from '../sacolaCarrinho';
import type { CartItem } from '../../types/marketplace';

const FORNECEDOR = { id: 10, nome: 'Distribuidora Caruaru' };
const OUTRO_FORNECEDOR = { id: 20, nome: 'SaborViva' };

function produto(over: Partial<ProdutoParaSacola> = {}): ProdutoParaSacola {
  return {
    id: 1,
    nome: 'Cerveja Heineken 330 ml',
    precoVenda: 5.5,
    unidade: 'UN',
    estoque: 100,
    ...over,
  };
}

function item(over: Partial<CartItem> = {}): CartItem {
  return {
    produtoId: 1,
    fornecedorId: FORNECEDOR.id,
    fornecedorNome: FORNECEDOR.nome,
    nome: 'Cerveja Heineken 330 ml',
    preco: 5.5,
    unidade: 'UN',
    quantidade: 1,
    ...over,
  };
}

describe('adicionarItem', () => {
  it('coloca o produto numa sacola vazia', () => {
    const r = adicionarItem([], produto(), FORNECEDOR, 2);
    expect(r.adicionado).toBe(true);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0]).toMatchObject({
      produtoId: 1,
      fornecedorId: FORNECEDOR.id,
      fornecedorNome: FORNECEDOR.nome,
      quantidade: 2,
      preco: 5.5,
    });
  });

  it('soma à quantidade quando o produto já está na sacola', () => {
    const r = adicionarItem([item({ quantidade: 3 })], produto(), FORNECEDOR, 2);
    expect(r.adicionado).toBe(true);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].quantidade).toBe(5);
  });

  it('separa o mesmo produto quando vem de fornecedores diferentes', () => {
    const r = adicionarItem([item()], produto(), OUTRO_FORNECEDOR, 1);
    expect(r.adicionado).toBe(true);
    expect(r.itens).toHaveLength(2);
    expect(r.itens.map((i) => i.fornecedorId)).toEqual([FORNECEDOR.id, OUTRO_FORNECEDOR.id]);
  });

  // Este era o bug: a tela mostrava "Não foi possível adicionar" mesmo dando certo,
  // porque o resultado era lido antes de o React rodar o atualizador do estado.
  it('avisa que adicionou sempre que a sacola muda', () => {
    const r = adicionarItem([], produto(), FORNECEDOR, 1);
    expect(r.adicionado).toBe(true);
    expect(r.motivo).toBeUndefined();
    expect(r.itens).not.toHaveLength(0);
  });

  it('recusa quando a soma passa do estoque e devolve a sacola intacta', () => {
    const original = [item({ quantidade: 8 })];
    const r = adicionarItem(original, produto({ estoque: 10 }), FORNECEDOR, 5);
    expect(r.adicionado).toBe(false);
    expect(r.itens).toBe(original);
    expect(r.motivo).toContain('10');
  });

  it('recusa produto sem estoque com mensagem própria', () => {
    const r = adicionarItem([], produto({ estoque: 0 }), FORNECEDOR, 1);
    expect(r.adicionado).toBe(false);
    expect(r.motivo).toContain('sem estoque');
  });

  it('aceita quando a quantidade bate exatamente com o estoque', () => {
    const r = adicionarItem([], produto({ estoque: 3 }), FORNECEDOR, 3);
    expect(r.adicionado).toBe(true);
    expect(r.itens[0].quantidade).toBe(3);
  });

  it('não limita quando o produto não controla estoque', () => {
    const r = adicionarItem([], produto({ estoque: null }), FORNECEDOR, 999);
    expect(r.adicionado).toBe(true);
    expect(r.itens[0].quantidade).toBe(999);
  });

  it('despreza a fração do estoque, porque só vende unidade inteira', () => {
    const r = adicionarItem([], produto({ estoque: 2.9 }), FORNECEDOR, 3);
    expect(r.adicionado).toBe(false);
    expect(estoqueDisponivel(2.9)).toBe(2);
  });

  it('recusa quantidade zero ou negativa', () => {
    expect(adicionarItem([], produto(), FORNECEDOR, 0).adicionado).toBe(false);
    expect(adicionarItem([], produto(), FORNECEDOR, -2).adicionado).toBe(false);
  });

  it('não altera a lista recebida', () => {
    const original = [item()];
    const copia = JSON.parse(JSON.stringify(original));
    adicionarItem(original, produto({ id: 2 }), FORNECEDOR, 1);
    expect(original).toEqual(copia);
  });
});

describe('alterarQuantidade e removerItem', () => {
  it('troca a quantidade do item certo', () => {
    const itens = [item(), item({ produtoId: 2, quantidade: 1 })];
    const r = alterarQuantidade(itens, FORNECEDOR.id, 2, 7);
    expect(r.find((i) => i.produtoId === 2)?.quantidade).toBe(7);
    expect(r.find((i) => i.produtoId === 1)?.quantidade).toBe(1);
  });

  it('quantidade zero remove o item', () => {
    const r = alterarQuantidade([item()], FORNECEDOR.id, 1, 0);
    expect(r).toHaveLength(0);
  });

  it('remove só o par fornecedor + produto', () => {
    const itens = [item(), item({ fornecedorId: OUTRO_FORNECEDOR.id })];
    const r = removerItem(itens, FORNECEDOR.id, 1);
    expect(r).toHaveLength(1);
    expect(r[0].fornecedorId).toBe(OUTRO_FORNECEDOR.id);
  });
});

describe('contagem e total', () => {
  it('conta unidades, não linhas', () => {
    expect(contarItens([item({ quantidade: 3 }), item({ produtoId: 2, quantidade: 2 })])).toBe(5);
  });

  it('soma preço vezes quantidade', () => {
    const itens = [
      item({ preco: 5.5, quantidade: 2 }),
      item({ produtoId: 2, preco: 10, quantidade: 3 }),
    ];
    expect(somarTotal(itens)).toBeCloseTo(41, 2);
  });

  it('sacola vazia conta zero', () => {
    expect(contarItens([])).toBe(0);
    expect(somarTotal([])).toBe(0);
    expect(encontrarItem([], 1, 1)).toBeUndefined();
  });
});
