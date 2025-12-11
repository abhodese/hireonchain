import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useNavigate } from 'react-router-dom';

export function WalletButton() {
  const { wallets, select, connect, publicKey, connected, connecting } = useWallet();
  const { isAuthenticated, logout } = useWalletAuth();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleWalletClick = async (walletName: string) => {
    const wallet = wallets.find(w => w.adapter.name === walletName);
    if (wallet) {
      select(wallet.adapter.name);
    }
    await connect();
    setShowModal(false);
  };

  const handleDisconnect = () => {
    logout();
    navigate('/');
  };

  if (connected && publicKey) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-400 text-white rounded-lg transition-colors"
      >
        {isAuthenticated && '✓ '}
        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={connecting}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 min-h-screen w-screen">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Connect Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-secondary-600 hover:text-primary-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {wallets
                .filter(w => w.readyState === 'Installed')
                .map(wallet => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletClick(wallet.adapter.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-600 rounded-lg hover:bg-primary-50 transition-colors hover:shadow-xl"
                  >
                    <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-8 h-8" />
                    <span className="font-medium">{wallet.adapter.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
