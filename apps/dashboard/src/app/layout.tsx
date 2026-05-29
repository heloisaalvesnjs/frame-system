import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Frame — Recepcionista Virtual para Nutricionistas',
  description: 'Automatize o atendimento do seu consultório com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: aplica tema antes do React hidratar */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('frame-theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
