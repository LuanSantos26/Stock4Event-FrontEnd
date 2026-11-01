import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveDevHost(): string {
  // Na versão web (ex.: aberta no Safari do iPhone e adicionada à tela inicial), o back-end
  // está na mesma máquina que serviu a página. "localhost" ali seria o próprio celular.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0]
    ?? (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0];

  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return expoHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

export const API_BASE_URL = `http://${resolveDevHost()}:8080`;

export function getImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
