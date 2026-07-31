'use client'

import { useEffect, useState } from 'react'
import { getMonthKey, getStudentPaymentSnapshot } from '../lib/student-utils'
import StudentStatusBadge from './StudentStatusBadge'

export default function AlumnoCuotaSection({ supabase, profile }) {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarPagos() {
      if (!supabase) return

      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('pagos')
        .select('*')
        .order('fecha_pago', { ascending: false })

      if (fetchError) {
        setError('No se pudieron cargar tus pagos.')
      } else {
        setPagos(data || [])
      }

      setLoading(false)
    }

    cargarPagos()
  }, [supabase])

  const snapshot = getStudentPaymentSnapshot(
    { id: profile?.alumnoId },
    pagos,
    getMonthKey()
  )

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Mi cuota</h2>
        <p>Tu estado de pago y el historial de tus cuotas.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <StudentStatusBadge
            label={snapshot.badgeLabel}
            tone={snapshot.badgeTone}
            helperText={snapshot.helperText}
          />

          <h3>Historial de pagos</h3>

          <div className="dataPanel">
            <div className="dataTableHeader misPagosGrid">
              <span>Fecha</span>
              <span>Medio</span>
              <span>Monto</span>
            </div>

            <div className="dataTableBody">
              {snapshot.studentPayments.length === 0 ? (
                <div className="studentsTableEmpty">
                  Todavia no tenes pagos registrados.
                </div>
              ) : (
                snapshot.studentPayments.map((pago) => (
                  <div key={pago.id} className="dataRow dataRowCompact misPagosGrid">
                    <span data-label="Fecha">{pago.fecha_pago || '-'}</span>
                    <span data-label="Medio">{pago.medio_pago || '-'}</span>
                    <strong data-label="Monto">
                      ${Number(pago.monto || 0).toLocaleString('es-AR')}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
