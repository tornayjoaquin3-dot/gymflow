export const metadata = {
  title: 'GymFlow',
  description: 'Gestión de gimnasios',
}

import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
