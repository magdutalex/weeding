import './globals.css'
import { Great_Vibes } from 'next/font/google';

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="en">
      
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}