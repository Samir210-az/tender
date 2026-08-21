import './globals.css';

export const metadata = {
  title: 'Tender AI — SECURITY GROUP',
  description: 'Tender analiz və proposal avtomatlaşdırma platforması',
};

export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
