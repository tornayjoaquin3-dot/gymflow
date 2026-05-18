'use client'

import AppShell from '@/components/AppShell'
import { seedAlumnos } from '@/services/data'

export default function RutinasPage(){
  return <AppShell>
    <div className="mb-5"><h1 className="text-3xl font-black">Rutinas</h1><p className="text-neutral-500">Rutinas actuales por alumno</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      {seedAlumnos.map(a=><div key={a.id} className="card p-5"><div className="text-sm text-neutral-500">{a.nombre}</div><h2 className="mt-1 text-xl font-black">{a.rutina}</h2><div className="mt-4 space-y-2 text-sm"><p>• Sentadilla — 4x8</p><p>• Press banca — 4x8</p><p>• Remo — 3x10</p><p>• Core — 3x30”</p></div></div>)}
    </div>
  </AppShell>
}
