export default function CostsSection({
  costos,
  nuevoCosto,
  setNuevoCosto,
  crearCosto,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Costos</h2>
        <p>Registro de egresos del gimnasio.</p>
      </div>

      <form onSubmit={crearCosto} className="costForm">
        <input
          placeholder="Descripción"
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
          placeholder="Observaciones"
          value={nuevoCosto.observaciones}
          onChange={(e) =>
            setNuevoCosto({
              ...nuevoCosto,
              observaciones: e.target.value,
            })
          }
        />

        <button>Registrar costo</button>
      </form>

      <div className="simpleList">
        {costos.length === 0 ? (
          <div className="empty">Todavía no hay costos cargados.</div>
        ) : (
          costos.map((costo) => (
            <article className="listCard" key={costo.id}>
              <h3>{costo.descripcion}</h3>

              <p className="dangerText">
                ${Number(costo.monto || 0).toLocaleString('es-AR')}
              </p>

              <p>Categoría: {costo.categoria || '-'}</p>
              <p>Observaciones: {costo.observaciones || '-'}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
