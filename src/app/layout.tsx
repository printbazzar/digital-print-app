import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Print Bazzar - Digital Printing Production Management',
  description:
    'Internal production tracking and machine counter management for Konica Minolta C3070',
  icons: {
    icon: '/logo-badge.png',
    apple: '/logo-badge.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-badge.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <Navbar />
            <main className="flex-1 pb-16">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
