import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: {
    default: 'Nerva - Warehouse & Inventory Management',
    template: '%s | Nerva',
  },
  description: 'Modern warehouse management, inventory control, and supply chain platform for growing businesses.',
  keywords: ['warehouse management', 'inventory', 'supply chain', 'WMS', 'ERP'],
  authors: [{ name: 'Nerva' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Nerva',
    title: 'Nerva - Warehouse & Inventory Management',
    description: 'Modern warehouse management, inventory control, and supply chain platform for growing businesses.',
  },
  twitter: {
    card: 'summary',
    title: 'Nerva - Warehouse & Inventory Management',
    description: 'Modern warehouse management, inventory control, and supply chain platform.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
