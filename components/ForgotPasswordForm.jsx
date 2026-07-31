'use client'

import { useState } from 'react'

export default function ForgotPasswordForm({ supabase, onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function enviarLink(event) {
    event.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Ingresa tu email.')
      return
    }

    if (!supabase) {
      setError('Configura las variables de Supabase para usar la app.')
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <main className="page">
      <section className="panel loginPanel">
        <h1>Recuperar contrasena</h1>
        <p>Ingresa tu email y te mandamos un link para elegir una contrasena nueva.</p>

        {sent ? (
          <div className="success">
            Si el email esta registrado, te va a llegar un link para reestablecer tu contrasena.
          </div>
        ) : (
          <form onSubmit={enviarLink} className="form">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            {error && <div className="error">{error}</div>}

            <button disabled={loading}>{loading ? 'Enviando...' : 'Enviar link'}</button>
          </form>
        )}

        <button type="button" className="linkButton" onClick={onBack}>
          Volver a ingresar
        </button>
      </section>
    </main>
  )
}
