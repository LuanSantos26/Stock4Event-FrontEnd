Add-Type -AssemblyName System.Speech
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }
$s.Rate = 0
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile((Join-Path $dir "cena01.wav"), $fmt); $s.Speak("Evento lotado, fila enorme... e a bebida acaba bem no pico?")
$s.SetOutputToWaveFile((Join-Path $dir "cena02.wav"), $fmt); $s.Speak("Hoje o pedido sai pelo WhatsApp, ninguém sabe o estoque de cada quiosque e o caixa fica sem controle. O Stock for event resolve tudo isso.")
$s.SetOutputToWaveFile((Join-Path $dir "cena03.wav"), $fmt); $s.Speak("Conheça o Stock for event: gestão de estoque feita para eventos.")
$s.SetOutputToWaveFile((Join-Path $dir "cena04.wav"), $fmt); $s.Speak("Acompanhe o estoque de cada quiosque e suas vendas na palma da mão.")
$s.SetOutputToWaveFile((Join-Path $dir "cena05.wav"), $fmt); $s.Speak("Precisa repor? Compre direto das distribuidoras parceiras, com catálogo, preços e disponibilidade em tempo real.")
$s.SetOutputToWaveFile((Join-Path $dir "cena06.wav"), $fmt); $s.Speak("Faça o pedido em poucos toques e acompanhe tudo, do pagamento à entrega.")
$s.SetOutputToWaveFile((Join-Path $dir "cena07.wav"), $fmt); $s.Speak("No balcão, o PDV registra a venda, calcula o troco e emite o comprovante na hora.")
$s.SetOutputToWaveFile((Join-Path $dir "cena08.wav"), $fmt); $s.Speak("E se você é distribuidor, seus produtos aparecem para todos os clientes assim que são cadastrados.")
$s.SetOutputToWaveFile((Join-Path $dir "cena09.wav"), $fmt); $s.Speak("Acesso seguro em tudo: cada empresa vê só os seus dados.")
$s.SetOutputToWaveFile((Join-Path $dir "cena10.wav"), $fmt); $s.Speak("Assine o Stock for event por cento e vinte e nove reais e noventa centavos por mês. Ou economize no plano anual: mil duzentos e noventa e nove reais, com dois meses grátis.")
$s.SetOutputToWaveFile((Join-Path $dir "cena11.wav"), $fmt); $s.Speak("Stock for event. Do estoque à entrega, seu evento sempre abastecido.")
$s.SetOutputToNull()
"pronto" | Out-File -Encoding utf8 (Join-Path $dir "pronto.txt")
