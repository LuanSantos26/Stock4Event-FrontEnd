Add-Type -AssemblyName System.Speech
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }
$s.Rate = 1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile((Join-Path $dir "fala1.wav"), $fmt); $s.Speak("Oi! Eu sou o Stockinho!")
$s.SetOutputToWaveFile((Join-Path $dir "fala2.wav"), $fmt); $s.Speak("Stock for event! Do estoque à entrega, seu evento sempre abastecido!")
$s.SetOutputToNull()
"pronto" | Out-File -Encoding utf8 (Join-Path $dir "pronto.txt")
