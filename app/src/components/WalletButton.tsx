import { useNavigate } from 'react-router-dom';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import toast from 'react-hot-toast';

export function WalletButton() {
  const navigate = useNavigate();
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const handleDisconnect = async () => {
    await disconnect();

    await new Promise(resolve => setTimeout(resolve, 1_000));

    navigate('/');
  };

  const handleWalletClick = async () => {
    try {
      if (!isConnected) {
        await open({ view: 'Connect', namespace: 'solana' });
        toast.success('Wallet connected!');
      } else {
        await handleDisconnect();
        toast.success('Wallet disconnected');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  if (isConnected && address) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-400 text-white rounded-lg transition-colors"
      >
        {isConnected && '✓ '}
        {address.slice(0, 4)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleWalletClick}
        disabled={status === 'connecting'}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </>
  );
}
