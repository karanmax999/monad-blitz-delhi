import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MANI X AI - AI-Powered DeFi Platform',
  description: 'Revolutionary multi-chain DeFi platform with AI-driven vault management and automated strategies',
  keywords: ['DeFi', 'AI', 'Multi-chain', 'Vault', 'Yield Farming', 'Blockchain'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="root" className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
