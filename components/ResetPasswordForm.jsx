'use client'

import { useState } from 'react'

export default function ResetPasswordForm({ supabase, onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function guardarPassword(event) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contrasena tiene que tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    if (!supabase) {
      setError('Configura las variables de Supabase para usar la app.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    onDone()
  }

  return (
    <main className="page">
      <section className="panel loginPanel">
        <h1>Elegi tu contrasena nueva</h1>
        <p>Esto reemplaza la contrasena anterior de tu cuenta.</p>

        <form onSubmit={guardarPassword} className="form">
          <label>Contrasena nueva</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <label>Repetir contrasena</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error && <div className="error">{error}</div>}

          <button disabled={loading}>{loading ? 'Guardando...' : 'Guardar contrasena'}</button>
        </form>
      </section>
    </main>
  )
}
