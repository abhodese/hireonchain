import { ReactNode } from 'react';
import Navbar from './Navbar';

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary-50 max-w-screen">{children}</main>
    </>
  );
};
