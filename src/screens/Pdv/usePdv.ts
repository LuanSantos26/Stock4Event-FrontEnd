import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { listarQuiosques } from '../../services/barracaService';
import { buscarProdutosPdv, finalizarVendaPdv } from '../../services/pdvService';
import type { Quiosque } from '../../types/quiosque';
import type { FormaPagamentoPdv, ItemCarrinhoPdv, ProdutoPdv, VendaPdv } from '../../types/pdv';
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  calcularTrocoCentavos,
  gerarChaveVenda,
  montarVendaPayload,
  parseValorEmCentavos,
  podeFinalizar,
  removerDoCarrinho,
  totalCentavos,
} from '../../utils/pdvCarrinho';
import { normalizarCodigoBarras, pareceCodigoBarras } from '../../utils/codigoBarras';

const ATRASO_BUSCA_MS = 300;

export function usePdv() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const empresaId = user?.empresa?.id;

  const [quiosques, setQuiosques] = useState<Quiosque[]>([]);
  const [carregandoQuiosques, setCarregandoQuiosques] = useState(true);
  const [erroQuiosques, setErroQuiosques] = useState('');
  const [barracaId, setBarracaId] = useState<number | null>(null);

  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<ProdutoPdv[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState('');

  const [carrinho, setCarrinho] = useState<ItemCarrinhoPdv[]>([]);
  const [aviso, setAviso] = useState('');
  const [forma, setForma] = useState<FormaPagamentoPdv | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');

  const [finalizando, setFinalizando] = useState(false);
  const [erroVenda, setErroVenda] = useState('');
  const [vendaConcluida, setVendaConcluida] = useState<VendaPdv | null>(null);

  // Mesma chave enquanto a venda não muda: um reenvio (rede caiu, clique repetido) não duplica.
  const chaveRef = useRef<string | null>(null);
  const enviandoRef = useRef(false);
  const buscaSeq = useRef(0);

  useEffect(() => {
    chaveRef.current = null;
  }, [carrinho, forma, valorRecebido, clienteNome, clienteDocumento, barracaId]);

  const carregarQuiosques = useCallback(async () => {
    if (!empresaId) return;
    setCarregandoQuiosques(true);
    setErroQuiosques('');
    try {
      const lista = (await listarQuiosques(empresaId)).filter((q) => q.ativa === 1);
      setQuiosques(lista);
      setBarracaId((atual) => (atual && lista.some((q) => q.id === atual) ? atual : lista[0]?.id ?? null));
    } catch (e) {
      setErroQuiosques(e instanceof Error ? e.message : 'Não foi possível carregar os pontos de venda.');
    } finally {
      setCarregandoQuiosques(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void carregarQuiosques();
  }, [carregarQuiosques]);

  const carregarProdutos = useCallback(async (termo: string, id: number) => {
    const seq = ++buscaSeq.current;
    setCarregandoProdutos(true);
    setErroProdutos('');
    try {
      const lista = await buscarProdutosPdv(id, termo);
      if (seq !== buscaSeq.current) return; // resposta de uma busca antiga
      // Não mexe no carrinho: mudar o carrinho gera nova chave de venda e um reenvio poderia duplicar.
      setProdutos(lista);
    } catch (e) {
      if (seq === buscaSeq.current) {
        setErroProdutos(e instanceof Error ? e.message : 'Não foi possível carregar os produtos.');
      }
    } finally {
      if (seq === buscaSeq.current) setCarregandoProdutos(false);
    }
  }, []);

  useEffect(() => {
    if (!barracaId) {
      setProdutos([]);
      return;
    }
    const t = setTimeout(() => void carregarProdutos(busca, barracaId), busca ? ATRASO_BUSCA_MS : 0);
    return () => clearTimeout(t);
  }, [busca, barracaId, carregarProdutos]);

  const adicionar = useCallback((produto: ProdutoPdv) => {
    setErroVenda('');
    setCarrinho((c) => {
      const r = adicionarAoCarrinho(c, produto);
      setAviso(r.aviso ?? '');
      return r.carrinho;
    });
  }, []);

  /**
   * Enter no campo de busca (leitor de código de barras ou digitação): acha o produto pelo
   * código de barras, pelo código interno ou, se só um produto bater com o nome, por ele;
   * coloca 1 unidade no carrinho e limpa o campo para a próxima leitura.
   */
  const lerCodigo = useCallback(async () => {
    const texto = busca.trim();
    if (!barracaId || !texto) return;
    const digitos = normalizarCodigoBarras(texto);
    // Leitores às vezes mandam espaços ou hífens no meio: se for "quase só número", usa os dígitos.
    const termo = pareceCodigoBarras(digitos) && digitos.length >= texto.replace(/[\s-]/g, '').length ? digitos : texto;
    setErroVenda('');
    try {
      const lista = await buscarProdutosPdv(barracaId, termo);
      const alvo = termo.toLowerCase();
      const produto =
        lista.find((p) => p.codigoBarras === termo || (p.codigo ?? '').toLowerCase() === alvo) ??
        (lista.length === 1 ? lista[0] : undefined);
      if (!produto) {
        setAviso(
          lista.length > 1
            ? `${lista.length} produtos encontrados para "${texto}". Toque no produto desejado.`
            : `Nenhum produto com o código ${texto} neste quiosque.`,
        );
        setProdutos(lista);
        return;
      }
      if (produto.disponivel <= 0) {
        setAviso(`${produto.nome} está sem estoque neste quiosque.`);
        return;
      }
      setCarrinho((c) => {
        const r = adicionarAoCarrinho(c, produto);
        setAviso(r.aviso ?? `${produto.nome} adicionado.`);
        return r.carrinho;
      });
      setBusca('');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível ler o código.');
    }
  }, [barracaId, busca]);

  const definirQuantidade = useCallback((produtoId: number, quantidade: number) => {
    setCarrinho((c) => {
      const r = alterarQuantidade(c, produtoId, quantidade);
      setAviso(r.aviso ?? '');
      return r.carrinho;
    });
  }, []);

  const remover = useCallback((produtoId: number) => {
    setAviso('');
    setCarrinho((c) => removerDoCarrinho(c, produtoId));
  }, []);

  const limparTudo = useCallback(() => {
    setCarrinho([]);
    setForma(null);
    setValorRecebido('');
    setClienteNome('');
    setClienteDocumento('');
    setAviso('');
    setErroVenda('');
  }, []);

  const limparCarrinho = useCallback(() => {
    if (carrinho.length === 0) return;
    confirm({
      title: 'Limpar carrinho',
      message: 'Remover todos os itens desta venda?',
      confirmText: 'Limpar',
      destructive: true,
      onConfirm: limparTudo,
    });
  }, [carrinho.length, confirm, limparTudo]);

  const trocarPontoDeVenda = useCallback((id: number) => {
    if (id === barracaId) return;
    const trocar = () => {
      limparTudo();
      setBusca('');
      setBarracaId(id);
    };
    if (carrinho.length === 0) {
      trocar();
      return;
    }
    confirm({
      title: 'Trocar ponto de venda',
      message: 'O carrinho atual será esvaziado. Continuar?',
      confirmText: 'Trocar',
      onConfirm: trocar,
    });
  }, [barracaId, carrinho.length, confirm, limparTudo]);

  const total = useMemo(() => totalCentavos(carrinho), [carrinho]);
  const troco = useMemo(
    () => (forma === 'dinheiro' && valorRecebido.trim() ? calcularTrocoCentavos(total, parseValorEmCentavos(valorRecebido)) : null),
    [forma, valorRecebido, total],
  );
  const pendencia = podeFinalizar({ carrinho, forma, valorRecebidoTexto: valorRecebido, clienteDocumento });

  const finalizar = useCallback(async () => {
    if (enviandoRef.current || pendencia || !barracaId || !forma) return;
    enviandoRef.current = true;
    setFinalizando(true);
    setErroVenda('');
    if (!chaveRef.current) chaveRef.current = gerarChaveVenda();
    try {
      const venda = await finalizarVendaPdv(
        montarVendaPayload({
          carrinho,
          barracaId,
          chaveVenda: chaveRef.current,
          forma,
          valorRecebidoTexto: valorRecebido,
          clienteNome,
          clienteDocumento,
        }),
      );
      setVendaConcluida(venda);
      limparTudo();
      void carregarProdutos(busca, barracaId); // estoque atualizado
    } catch (e) {
      setErroVenda(e instanceof Error ? e.message : 'Não foi possível finalizar a venda.');
      void carregarProdutos(busca, barracaId);
    } finally {
      enviandoRef.current = false;
      setFinalizando(false);
    }
  }, [pendencia, barracaId, forma, carrinho, valorRecebido, clienteNome, clienteDocumento, limparTudo, carregarProdutos, busca]);

  return {
    quiosques, carregandoQuiosques, erroQuiosques, carregarQuiosques, barracaId, trocarPontoDeVenda,
    busca, setBusca, lerCodigo, produtos, carregandoProdutos, erroProdutos,
    recarregarProdutos: () => barracaId && carregarProdutos(busca, barracaId),
    carrinho, aviso, adicionar, definirQuantidade, remover, limparCarrinho,
    forma, setForma, valorRecebido, setValorRecebido, clienteNome, setClienteNome, clienteDocumento, setClienteDocumento,
    total, troco, pendencia, finalizando, erroVenda, finalizar,
    vendaConcluida, fecharVenda: () => setVendaConcluida(null),
  };
}
