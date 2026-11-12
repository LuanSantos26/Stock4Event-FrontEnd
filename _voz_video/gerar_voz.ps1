Add-Type -AssemblyName System.Speech
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + ' | ' + $_.VoiceInfo.Culture.Name + ' | ' + $_.VoiceInfo.Gender } | Out-File -Encoding utf8 "$dir\vozes.txt"
$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }
$s.Rate = 1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile("$dir\necessidade.wav", $fmt)
$s.Speak("Hoje o pedido sai pelo WhatsApp, ninguém sabe o estoque de cada quiosque e o caixa fica sem controle. O Stock for event resolve tudo isso.")
$s.SetOutputToWaveFile("$dir\precos.wav", $fmt)
$s.Speak("Assine o Stock for event por cento e vinte e nove reais e noventa centavos por mês. Ou economize no plano anual: mil duzentos e noventa e nove reais, com dois meses grátis.")
$s.SetOutputToNull()
"pronto" | Out-File -Encoding utf8 "$dir\pronto.txt"
