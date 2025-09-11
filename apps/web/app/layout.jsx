import './globals.css';

export const metadata = {
  title: 'FinAI',
  description: 'Gestão financeira pessoal com IA — estilo liquid glass, PT-BR',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          background:
            'linear-gradient(135deg, rgba(240,243,255,0.9), rgba(220,225,255,0.6))',
        }}
      >
        {children}
      </body>
    </html>
  );
}
