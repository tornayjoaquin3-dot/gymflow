export const APP_CONFIG = {
  softwareName: 'CORE',
  softwareVersion: '1.0',
  organizationName: 'Analitic',
  organizationSlug: 'analitic',
  // Sin logo propio todavia: la UI debe mostrar el nombre como fallback
  // en vez de romper con un <img> vacio (ver Sidebar.jsx y el login en page.js).
  organizationLogo: null,
  // Hoy coinciden con los colores ya usados en globals.css (--primary y
  // --success) para que activar esto no cambie nada visualmente todavia:
  // el objetivo de esta etapa es dejar el dato disponible en un solo
  // lugar, no rediseñar. Cambiar estos valores ya alcanza para re-brandear
  // los puntos que los usan (Sidebar, login).
  organizationPrimaryColor: '#171717',
  organizationSecondaryColor: '#1f9d73',
}
