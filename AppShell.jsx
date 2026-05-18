'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Users, WalletCards, Dumbbell, LogOut } from 'lucide-react'

const navByRole = {
  socio: [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/alumnos', label: 'Alumnos', icon: Users },
    { href: '/costos', label: 'Costos', icon: WalletCards },
    { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  ],
  profesor: [
    { href: '/alumnos', label: 'Alumnos', icon: Users },
    { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  ],
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const role = typeof window !== 'undefined' ? localStorage.getItem('gymflow_role') || 'socio' : 'socio'
  const email = typeof window !== 'undefined' ? localStorage.getItem('gymflow_email') || '' : ''
  const nav = navByRole[role] || navByRole.profesor

  function logout() {
    localStorage.removeItem('gymflow_role')
    localStorage.removeItem('gymflow_email')
    router.push('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black font-black text-white">GF</div>
            <div>
              <div className="text-lg font-black">GymFlow</div>
              <div className="text-xs text-neutral-500">{role === 'socio' ? 'Socio / Administrador' : 'Profesor'} · {email}</div>
            </div>
          </div>
          <button className="btn-secondary flex items-center gap-2" onClick={logout}><LogOut size={16}/> Salir</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:grid-cols-[230px_1fr]">
        <aside className="card h-fit p-2">
          {nav.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold ${active ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <Icon size={18}/>{item.label}
              </Link>
            )
          })}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}
