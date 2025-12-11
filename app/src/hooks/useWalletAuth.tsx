import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import api from '../utils/api';

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

export const useWalletAuth = () => {
  const { publicKey, signMessage } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticateWallet = async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected or does not support signing');
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Step 1: Request challenge from backend
      const challengeResponse = await api.post<ChallengeResponse>(`/api/auth/challenge`, {
        publicKey: publicKey.toBase58(),
      });

      const { nonce, message } = challengeResponse.data;

      // Step 2: Sign the message with wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.encode(signatureBytes);

      // Step 3: Verify signature with backend
      const verifyResponse = await api.post<VerifyResponse>(`/api/auth/sign`, {
        publicKey: publicKey.toBase58(),
        signature,
        nonce,
      });

      if (verifyResponse.data.success) {
        console.log('✅ Wallet authenticated successfully');

        localStorage.setItem('wallet_verified', 'true');
        return true;
      }

      setError('Verification failed');
      return false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed';
      setError(errorMessage);
      console.error('Authentication error:', err);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    authenticateWallet,
    isAuthenticating,
    error,
  };
};
