export default function Dashboard({
  totalIngresos,
  totalCostos,
  ganancia,
  alumnos,
  pagos,
  costos,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Dashboard</h2>
        <p>Resumen económico general del gimnasio.</p>
      </div>

      <div className="cards">
        <article>
          <span>Total ingresos</span>
          <b className="money">${totalIngresos.toLocaleString('es-AR')}</b>
        </article>

        <article>
          <span>Total costos</span>
          <b className="dangerText">${totalCostos.toLocaleString('es-AR')}</b>
        </article>

        <article>
          <span>Resultado</span>
          <b className={ganancia >= 0 ? 'money' : 'dangerText'}>
            ${ganancia.toLocaleString('es-AR')}
          </b>
        </article>

        <article>
          <span>Alumnos</span>
          <b>{alumnos.length} registrados</b>
        </article>

        <article>
          <span>Pagos</span>
          <b>{pagos.length} registrados</b>
        </article>

        <article>
          <span>Costos</span>
          <b>{costos.length} registrados</b>
        </article>
      </div>
    </section>
  )
}
