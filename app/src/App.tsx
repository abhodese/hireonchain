import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import PrivateRoute from './components/PrivateRoute';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';
// Temp page and layout components
import New from './pages/New';
import { Toaster } from 'react-hot-toast';
import { ScrollToTop } from './components/ScrollToTop';
import { Layout } from './layout';
import { Loading } from './components/Loading';
import { AuthProvider } from './contexts/AuthProvider';

// Lazy load to optimize
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const JobList = lazy(() => import('./pages/JobList'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const CreateJob = lazy(() => import('./pages/CreateJob'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  // Set up Solana network connection (devnet for testing)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  // Initialize wallet adapters
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>
            <Router>
              <Layout>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/new" element={<New />} />

                    {/* Private routes that require authentication */}
                    <Route
                      path="/dashboard"
                      element={
                        <PrivateRoute>
                          <Dashboard />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <PrivateRoute>
                          <Profile />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/jobs/create"
                      element={
                        <PrivateRoute>
                          <CreateJob />
                        </PrivateRoute>
                      }
                    />
                    <Route path="/jobs" element={<JobList />} />
                    <Route
                      path="/jobs/:id"
                      element={
                        <PrivateRoute>
                          <JobDetail />
                        </PrivateRoute>
                      }
                    />

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                <ScrollToTop />
              </Layout>
            </Router>
          </AuthProvider>
          <Toaster position="top-center" />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
