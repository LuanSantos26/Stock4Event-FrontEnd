import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { QrCode } from '../../components/QrCode';
import { buscarDadosBancarios } from '../../services/dadosBancariosService';
import { formatarPreco } from '../../services/productService';
import { gerarPixCopiaECola } from '../../utils/pagamentoSimulado';
import { PDV } from './styles';

interface Recebedor {
  chave: string;
  tipoChave: string;
  nome: string;
  origem: 'dados-bancarios' | 'cnpj';
}

interface Props {
  /** Total da venda em centavos. */
  totalCentavos: number;
  /** Quiosque da venda, vai no identificador da cobrança. */
  barracaId: number | null;
}

/** QR Code Pix da venda do PDV, com a chave da empresa dona do quiosque (pagamento simulado). */
export function PixPdv({ totalCentavos, barracaId }: Props) {
  const { user } = useAuth();
  const empresa = user?.empresa;
  const [recebedor, setRecebedor] = useState<Recebedor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      if (!empresa?.id) return;
      setCarregando(true);
      let r: Recebedor | null = null;
      try {
        const dados = await buscarDadosBancarios(empresa.id);
        if (dados?.chavePix) {
          r = { chave: dados.chavePix, tipoChave: dados.tipoChavePix ?? 'aleatoria', nome: dados.titular || empresa.nome, origem: 'dados-bancarios' };
        }
      } catch {
        // sem rede ou sem cadastro: usa o CNPJ da empresa
      }
      if (!r && empresa.cnpj) {
        r = { chave: empresa.cnpj, tipoChave: 'cnpj', nome: empresa.nome, origem: 'cnpj' };
      }
      if (vivo) {
        setRecebedor(r);
        setCarregando(false);
      }
    }
    void carregar();
    return () => {
      vivo = false;
    };
  }, [empresa?.id, empresa?.cnpj, empresa?.nome]);

  const codigo = useMemo(() => {
    if (!recebedor || totalCentavos <= 0) return '';
    return gerarPixCopiaECola({
      chave: recebedor.chave,
      tipoChave: recebedor.tipoChave,
      nomeRecebedor: recebedor.nome,
      valor: totalCentavos / 100,
      txid: `PDV${barracaId ?? 0}T${Date.now().toString(36).toUpperCase()}`.slice(0, 25),
    });
    // O txid muda só quando o valor ou o quiosque mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recebedor, totalCentavos, barracaId]);

  async function copiar() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(codigo);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      } catch {
        // o texto continua selecionável
      }
    }
  }

  if (carregando) {
    return (
      <View style={{ alignItems: 'center', padding: 16 }}>
        <ActivityIndicator color={PDV.suave} />
      </View>
    );
  }

  if (!recebedor) {
    return (
      <Text style={{ marginTop: 10, color: PDV.avisoTexto, backgroundColor: PDV.avisoFundo, padding: 10, borderRadius: 10, fontSize: 13 }}>
        Cadastre a chave Pix da empresa em Ajustes › Dados bancários para gerar o QR Code.
      </Text>
    );
  }

  if (totalCentavos <= 0) {
    return (
      <Text style={{ marginTop: 10, color: PDV.suave, fontSize: 13 }}>
        Adicione produtos ao carrinho para gerar o QR Code Pix.
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: PDV.borda, borderRadius: 14, padding: 14, backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: PDV.texto }}>
        Pix de {formatarPreco(totalCentavos / 100)} para {recebedor.nome}
      </Text>
      <QrCode value={codigo} size={200} />
      <Text style={{ fontSize: 12, color: PDV.suave, textAlign: 'center' }}>
        O cliente escaneia com o app do banco. Confira o recebimento antes de finalizar.
      </Text>
      <TouchableOpacity onPress={copiar} disabled={Platform.OS !== 'web'} style={{ alignSelf: 'stretch' }}>
        <Text selectable numberOfLines={3} style={{ fontSize: 11, color: PDV.texto, backgroundColor: PDV.fundo, borderRadius: 8, padding: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          {codigo}
        </Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 11, color: copiado ? PDV.ok : PDV.suave }}>
        {copiado
          ? 'Código copiado.'
          : recebedor.origem === 'cnpj'
            ? 'Chave Pix: CNPJ da empresa. Para usar outra, cadastre em Dados bancários.'
            : 'Pagamento simulado para demonstração.'}
      </Text>
    </View>
  );
}
