
// Los campos que usarás en el formulario modal
export const camposDocente = (materiasOptions = [], usuariosOptions = []) => [
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'apellido', label: 'Apellido', type: 'text', required: true },
    { name: 'genero', label: 'Género', type: 'select',  opciones: [
    { value: 'MASCULINO', label: 'Masculino' },
    { value: 'FEMENINO', label: 'Femenino' },
    { value: 'OTRO', label: 'Otro' },
]},
    { name: 'dni', label: 'DNI', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'direccion', label: 'Dirección', type: 'text', required: true },
    { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
    { name: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
    { name: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date', required: true },

  // Multi-select materias
  { name: 'materiasIds', label: 'Materias', type: 'multiselect', opciones: materiasOptions },

  // Select usuario disponible (solo uno)
  { name: 'usuarioId', label: 'Usuario', type: 'select', opciones: usuariosOptions },
];


