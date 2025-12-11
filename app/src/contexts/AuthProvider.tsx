// src/contexts/AuthContext.tsx

import { createContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import api from '../utils/api';
import { authReducer, initialAuthState, AuthState } from './AuthReducter';

interface ChallengeResponse {
  message: string;
  nonce: string;
  publicKey: string;
}

interface VerifyResponse {
  success: boolean;
  publicKey: string;
  message: string;
}

interface AuthContextType extends AuthState {
  // ensure the context exposes the same error shape as the reducer
  error: string | null;
  authenticateWallet: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Check for existing session on mount
  useEffect(() => {
    const walletVerified = localStorage.getItem('wallet_verified');

    if (walletVerified === 'true' && connected && publicKey) {
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { publicKey: publicKey.toBase58() },
      });
    }
  }, [connected, publicKey]);

  const authenticateWallet = useCallback(async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: 'Wallet not connected or does not support signing',
      });
      return false;
    }

    dispatch({ type: 'AUTH_START' });

    try {
      // Step 1: Request challenge
      const challengeResponse = await api.post<ChallengeResponse>('/api/auth/challenge', {
        publicKey: publicKey.toBase58(),
      });

      const { nonce, message } = challengeResponse.data;

      // Step 2: Sign message
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.encode(signatureBytes);

      // Step 3: Verify signature
      const verifyResponse = await api.post<VerifyResponse>('/api/auth/sign', {
        publicKey: publicKey.toBase58(),
        signature,
        nonce,
      });

      if (verifyResponse.data.success) {
        const publicKeyStr = publicKey.toBase58();

        // Persist auth state
        localStorage.setItem('wallet_verified', 'true');

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { publicKey: publicKeyStr },
        });

        return true;
      }

      dispatch({
        type: 'AUTH_FAILURE',
        payload: 'Verification failed',
      });
      return false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });
      return false;
    }
  }, [publicKey, signMessage]);

  const handleLogout = useCallback(() => {
    localStorage.clear();

    dispatch({ type: 'AUTH_LOGOUT' });
    if (connected) {
      disconnect();
    }
  }, [connected, disconnect]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: AuthContextType = {
    ...state,
    authenticateWallet,
    logout: handleLogout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
