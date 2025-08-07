
// Los campos que usarás en el formulario modal
export const camposDocente = (materiasOptions = [], usuariosOptions = [], modoVista = false) => {
  const camposBase = [
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'apellido', label: 'Apellido', type: 'text', required: true },
    {
      name: 'genero',
      label: 'Género',
      type: 'select',
      opciones: [
        { value: 'MASCULINO', label: 'Masculino' },
        { value: 'FEMENINO', label: 'Femenino' },
        { value: 'OTRO', label: 'Otro' },
      ]
    },
    { name: 'dni', label: 'DNI', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'direccion', label: 'Dirección', type: 'text', required: true },
    { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
    { name: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
    { name: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date', required: true },
  ];

  const camposFormulario = [
    { name: 'materiasIds', label: 'Materias', type: 'multiselect', opciones: materiasOptions },
    { name: 'usuarioId', label: 'Usuario', type: 'select', opciones: usuariosOptions },
  ];

  const campoMateriasVista = {
    name: 'materias',
    label: 'Materias asignadas',
    render: (d) =>
      d.materias?.length
        ? d.materias.map((m) => m.nombreMateria).join(', ')
        : 'Sin materias asignadas',
  };

  return modoVista
    ? [...camposBase, campoMateriasVista]
    : [...camposBase, ...camposFormulario];
};
