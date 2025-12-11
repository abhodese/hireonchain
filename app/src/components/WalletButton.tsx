import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

export function WalletButton() {
  const { wallets, select, connect, disconnect, publicKey, connected, connecting } = useWallet();
  const [showModal, setShowModal] = useState(false);

  const handleWalletClick = async (walletName: string) => {
    const wallet = wallets.find(w => w.adapter.name === walletName);
    if (wallet) {
      select(wallet.adapter.name);
    }
    await connect();
    setShowModal(false);
  };

  if (connected && publicKey) {
    return (
      <button
        onClick={disconnect}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-400 text-white rounded-lg transition-colors"
      >
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Connect Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {wallets
                .filter(w => w.readyState === 'Installed')
                .map(wallet => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletClick(wallet.adapter.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
