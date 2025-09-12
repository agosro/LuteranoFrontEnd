export const camposAula = (modoVista = false, cursosOptions = []) => [
  { name: "nombre", label: "Nombre del aula", type: "text", required: true, readOnly: modoVista },
  { name: "ubicacion", label: "Ubicación", type: "text", required: true, readOnly: modoVista },
  { name: "capacidad", label: "Capacidad", type: "number", required: false, min: 1, readOnly: modoVista },
  { name: "cursoId", label: "Curso asignado", type: "select", opciones: cursosOptions, required: false, readOnly: modoVista }
];