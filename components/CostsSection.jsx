import { useMemo, useState } from 'react'
import { normalizeText } from '../lib/student-utils'

const EMPTY_FILTERS = {
  descripcion: '',
  categoria: '',
  monto: '',
  fechaDesde: '',
  fechaHasta: '',
}

export default function CostsSection({
  costos,
  nuevoCosto,
  setNuevoCosto,
  crearCosto,
  editingCostoId,
  editarCosto,
  cancelarEdicionCosto,
  eliminarCosto,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const filteredCostos = useMemo(() => {
    const normalizedDescripcion = normalizeText(filters.descripcion)
    const normalizedMonto = String(filters.monto || '').trim()

    return [...costos]
      .sort((left, right) => {
        const leftTime = new Date(left?.fecha || 0).getTime()
        const rightTime = new Date(right?.fecha || 0).getTime()
        return rightTime - leftTime
      })
      .filter((costo) => {
        const descripcionMatches =
          !normalizedDescripcion ||
          normalizeText(costo.descripcion).includes(normalizedDescripcion)

        const categoriaMatches =
          !filters.categoria || costo.categoria === filters.categoria

        const montoMatches =
          !normalizedMonto ||
          String(costo.monto ?? '').includes(normalizedMonto)

        const fechaCosto = costo.fecha || ''
        const fechaDesdeMatches =
          !filters.fechaDesde || (fechaCosto && fechaCosto >= filters.fechaDesde)
        const fechaHastaMatches =
          !filters.fechaHasta || (fechaCosto && fechaCosto <= filters.fechaHasta)

        return (
          descripcionMatches &&
          categoriaMatches &&
          montoMatches &&
          fechaDesdeMatches &&
          fechaHastaMatches
        )
      })
  }, [costos, filters])

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Costos</h2>
        <p>Registro de egresos del gimnasio.</p>
      </div>

      <form onSubmit={crearCosto} className="costForm">
        <input
          placeholder="Descripcion"
          value={nuevoCosto.descripcion}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              descripcion: e.target.value,
            })
          }
        />

        <select
          value={nuevoCosto.categoria}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              categoria: e.target.value,
            })
          }
        >
          <option value="alquiler">Alquiler</option>
          <option value="sueldos">Sueldos</option>
          <option value="servicios">Servicios</option>
          <option value="equipamiento">Equipamiento</option>
          <option value="marketing">Marketing</option>
          <option value="otros">Otros</option>
        </select>

        <input
          placeholder="Monto"
          type="number"
          value={nuevoCosto.monto}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              monto: e.target.value,
            })
          }
        />

        <input
          type="date"
          value={nuevoCosto.fecha}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              fecha: e.target.value,
            })
          }
        />

        <input
          placeholder="Observaciones"
          value={nuevoCosto.observaciones}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              observaciones: e.target.value,
            })
          }
        />

        <button>{editingCostoId ? 'Guardar cambios' : 'Registrar costo'}</button>

        {editingCostoId && (
          <button
            type="button"
            className="smallButton"
            onClick={cancelarEdicionCosto}
          >
            Cancelar edicion
          </button>
        )}
      </form>

      <div className="costFilters">
        <input
          placeholder="Filtrar por descripcion"
          value={filters.descripcion}
          onChange={(event) => updateFilter('descripcion', event.target.value)}
        />

        <select
          value={filters.categoria}
          onChange={(event) => updateFilter('categoria', event.target.value)}
        >
          <option value="">Todas las categorias</option>
          <option value="alquiler">Alquiler</option>
          <option value="sueldos">Sueldos</option>
          <option value="servicios">Servicios</option>
          <option value="equipamiento">Equipamiento</option>
          <option value="marketing">Marketing</option>
          <option value="otros">Otros</option>
        </select>

        <input
          placeholder="Filtrar por monto"
          value={filters.monto}
          onChange={(event) => updateFilter('monto', event.target.value)}
        />

        <input
          type="date"
          value={filters.fechaDesde}
          onChange={(event) => updateFilter('fechaDesde', event.target.value)}
        />

        <input
          type="date"
          value={filters.fechaHasta}
          onChange={(event) => updateFilter('fechaHasta', event.target.value)}
        />
      </div>

      <div className="dataPanel">
        <div className="dataTableHeader costsTableGrid">
          <span>Fecha</span>
          <span>Descripcion</span>
          <span>Tipo / Categoria</span>
          <span>Monto</span>
          <span>Observaciones</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {filteredCostos.length === 0 ? (
            <div className="studentsTableEmpty">
              No hay costos que coincidan con los filtros.
            </div>
          ) : (
            filteredCostos.map((costo) => (
              <div key={costo.id} className="dataRow costsTableGrid">
                <span>{costo.fecha || 'Sin fecha'}</span>
                <strong>{costo.descripcion || '-'}</strong>
                <span>{costo.categoria || '-'}</span>
                <strong className="dangerText">
                  ${Number(costo.monto || 0).toLocaleString('es-AR')}
                </strong>
                <span>{costo.observaciones || '-'}</span>
                <div className="rowActions">
                  <button
                    type="button"
                    className="smallButton"
                    onClick={() => editarCosto(costo)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="smallButton dangerButton"
                    onClick={() => eliminarCosto(costo.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
