import { APP_CONFIG } from '../lib/app-config'

export default function Footer() {
  return (
    <footer className="appFooter">
      <span>
        Powered by {APP_CONFIG.softwareName}
      </span>
    </footer>
  )
}
