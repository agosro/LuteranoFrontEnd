export const camposAula = (modoVista = false, cursosOptions = []) => [
  { name: "nombre", label: "Nombre del aula", type: "text", required: true, readOnly: modoVista },
  { name: "ubicacion", label: "Ubicación", type: "text", required: true, readOnly: modoVista },
  { name: "capacidad", label: "Capacidad", type: "number", required: true, min: 1, readOnly: modoVista },
  // Solo mostrar curso asignado en modo vista, no en creación/edición
  ...(modoVista ? [
    { name: "cursoId", label: "Curso asignado", type: "select", opciones: cursosOptions, required: false, readOnly: true }
  ] : [])
];