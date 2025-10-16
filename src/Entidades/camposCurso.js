export const camposCurso = (
  modoVista = false,
  aulasOptions = [],
  materiasOptions = [],
  incluirMaterias = true
) => [
  { 
    name: "anio", 
    label: "Año", 
    type: "select", 
    opciones: [
      { value: 1, label: "1°" },
      { value: 2, label: "2°" },
      { value: 3, label: "3°" },
      { value: 4, label: "4°" },
      { value: 5, label: "5°" },
      { value: 6, label: "6°" },
    ], 
    required: true, 
    readOnly: modoVista 
  },

  { 
    name: "division", 
    label: "División", 
    type: "select", 
    opciones: [
      { value: "A", label: "A" },
      { value: "B", label: "B" },
    ], 
    required: true, 
    readOnly: modoVista 
  },

  { 
    name: "nivel", 
    label: "Nivel", 
    type: "select", 
    opciones: [
      { value: "BASICO", label: "Básico" },
      { value: "ORIENTADO", label: "Orientado" },
    ], 
    required: true, 
    readOnly: modoVista 
  },

  // Aula: en vista mostramos el nombre (texto); en edición usamos select por id
  ...(modoVista
    ? [{
        name: "aulaNombre",
        label: "Aula asignada",
        type: "text",
        required: false,
        readOnly: true,
      }]
    : [{
        name: "aulaId",
        label: "Aula asignada",
        type: "select",
        opciones: aulasOptions,
        required: true,
        readOnly: false,
      }]
  ),

  ...(incluirMaterias ? [{
    name: "materias", 
    label: "Materias dictadas", 
    type: "multiselect", 
    opciones: materiasOptions, 
    required: false, 
    readOnly: modoVista 
  }] : [])
];
