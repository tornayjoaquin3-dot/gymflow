import './globals.css'
import { APP_CONFIG } from '../lib/app-config'

export const metadata = {
  title: `${APP_CONFIG.organizationName.toUpperCase()} | ${APP_CONFIG.softwareName}`,
  description: 'Gestión de gimnasios',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
