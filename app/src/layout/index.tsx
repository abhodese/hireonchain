import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col max-w-screen">
      <Navbar />
      <main className="min-h-screen flex-1 bg-secondary-50">{children}</main>
      <Footer />
    </div>
  );
};
