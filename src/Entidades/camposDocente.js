export const camposDocente = (usuariosOptions = [], modoVista = false, modoEdicion = false,  emailDisabled = false) => {
  const campoUsuario = {
    name: 'usuarioId',
    label: 'Usuario',
    type: 'select',
    opciones: usuariosOptions,
    required: false,
    disabled: modoEdicion,  // deshabilita seleccionar otro usuario en edición
  };

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
      ],
      required: true,
    },
    {
      name: 'tipoDoc',
      label: 'Tipo Documento',
      type: 'select',
      opciones: [
        { value: 'DNI', label: 'DNI' },
        { value: 'PASAPORTE', label: 'Pasaporte' },
        { value: 'CARNET_EXTRANJERIA', label: 'Carnet de Extranjería' },
        // agregá los que correspondan según tu enum en backend
      ],
      required: true,
    },
    { name: 'dni', label: 'DNI', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true, disabled: emailDisabled},
    { name: 'direccion', label: 'Dirección', type: 'text', required: true },
    { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
    { name: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
    { name: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date', required: true },
  ];

  const campoMateriasVista = {
    name: 'materias',
    label: 'Materias asignadas',
    render: (d) =>
      d.materias?.length
        ? d.materias.map((m) => m.nombreMateria).join(', ')
        : 'Sin materias asignadas',
  };

  if (modoVista) return [...camposBase, campoMateriasVista];

  return [campoUsuario, ...camposBase];
};