import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-50 border-t border-primary-100 mt-auto w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-primary-600 font-bold text-lg">Solana Freelance</div>

          <div className="flex items-center gap-6 text-sm text-secondary-600">
            <Link to="/about" className="hover:text-primary-600">
              About
            </Link>
            <Link to="/terms" className="hover:text-primary-600">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-primary-600">
              Privacy
            </Link>
          </div>

          <div className="text-sm text-secondary-500">
            © {new Date().getFullYear()} <span className="text-primary-600 ">Solana Freelance</span>
            . All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
