import './globals.css'

export const metadata = {
  title: 'GymFlow',
  description: 'Gestión de alumnos, pagos, costos y rutinas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
