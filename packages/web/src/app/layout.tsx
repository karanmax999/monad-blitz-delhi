import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MANI X AI - Cross-Chain DeFi Dashboard',
  description: 'AI-powered cross-chain vault management with LayerZero integration',
  keywords: 'DeFi, AI, Cross-chain, LayerZero, Vault, Ethereum, Polygon, Arbitrum, BSC, Monad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <WebSocketProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-6">
                    {children}
                  </main>
                </div>
              </div>
            </NotificationProvider>
          </WebSocketProvider>
        </Providers>
      </body>
    </html>
  );
}
