import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

const KEYCLOAK_URL = process.env['EXPO_PUBLIC_KEYCLOAK_URL'] ?? 'http://localhost:8080';
const REALM = process.env['EXPO_PUBLIC_KEYCLOAK_REALM'] ?? 'gb-mis';
const CLIENT_ID = process.env['EXPO_PUBLIC_KEYCLOAK_CLIENT_ID'] ?? 'gb-mis-mobile';

const DISCOVERY_URL = `${KEYCLOAK_URL}/realms/${REALM}`;
const ACCESS_TOKEN_KEY = 'gbmis.accessToken';
const REFRESH_TOKEN_KEY = 'gbmis.refreshToken';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const discovery = AuthSession.useAutoDiscovery(DISCOVERY_URL);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'gbmis', path: 'auth' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      usePKCE: true,
    },
    discovery,
  );

  useEffect(() => {
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
      .then((token) => {
        setAccessToken(token);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && discovery) {
      AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code: response.params['code'] ?? '',
          redirectUri,
          extraParams: { code_verifier: request?.codeVerifier ?? '' },
        },
        discovery,
      ).then(async (tokens) => {
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
          tokens.refreshToken
            ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
            : Promise.resolve(),
        ]);
        setAccessToken(tokens.accessToken);
      });
    }
  }, [response, discovery, request, redirectUri]);

  const login = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const logout = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!accessToken,
        isLoading,
        accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
