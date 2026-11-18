import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';

/**
 * PDF: no navegador abre a impressão (escolha "Salvar como PDF"); no celular abre o
 * diálogo do sistema, que também salva em PDF.
 */
export async function baixarPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const janela = window.open('', '_blank', 'width=900,height=700');
    if (!janela) throw new Error('Permita pop-ups para baixar o relatório.');
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    janela.print();
    return;
  }
  await Print.printAsync({ html });
}

/** CSV: no navegador baixa o arquivo; no celular abre o compartilhar (e-mail, WhatsApp, Drive…). */
export async function baixarCsv(csv: string, nomeArquivo: string): Promise<void> {
  if (Platform.OS === 'web') {
    // O BOM faz o Excel ler os acentos certo.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: nomeArquivo, message: csv });
}
