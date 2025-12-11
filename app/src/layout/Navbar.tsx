import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WalletConnect from '../components/WalletConnect';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  // Listen for storage changes (when token is added/removed)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setIsLoggedIn(false);
    // Dispatch custom event to notify all listeners
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <>
      <nav className="hidden md:flex bg-primary-50 shadow-lg mb-12">
        <div className="w-screen px-4 sm:px-6 lg:px-8 flex justify-between h-16">
          <Link
            to="/"
            className="text-primary-600 font-bold text-xl shrink-0 flex items-center hover:text-primary-500"
          >
            Solana Freelance
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-4 w-screen justify-end">
            <Link
              to="/"
              className="text-primary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
            >
              Home
            </Link>
            <Link
              to="/jobs"
              className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
            >
              Jobs
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md font-semibold"
                >
                  Register
                </Link>
              </>
            )}

            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <nav>
        <div className="bg-primary-50 shadow-lg mb-12">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 md:hidden">
            <Link to="/" className="text-primary-600 font-bold text-xl hover:text-primary-500">
              Solana Freelance
            </Link>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-100 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu Items */}
          <div
            className={`${
              isMobileMenuOpen ? 'block' : 'hidden'
            } md:hidden px-2 pt-2 pb-3 space-y-1 border-t border-gray-200`}
          >
            <Link
              to="/"
              className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/jobs"
              className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Jobs
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block text-secondary-600 hover:text-primary-600 px-3 py-2 rounded-md text-base font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
            <div className="pt-4 px-3 border-t border-gray-200 mt-2">
              <WalletConnect />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
