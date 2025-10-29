export const camposEspacioAulico = (modoVista = false) => [
  { name: "nombre", label: "Nombre del espacio", type: "text", required: true, readOnly: modoVista },
  { name: "ubicacion", label: "Ubicación", type: "text", required: true, readOnly: modoVista },
  { name: "capacidad", label: "Capacidad", type: "number", required: true, min: 1, readOnly: modoVista },
];
