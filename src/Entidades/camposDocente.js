// ✅ Entidades/camposDocente.js
export const camposDocente = (
  usuariosOptions = [],
  modoVista = false,
  modoEdicion = false,
  emailDisabled = false,
  incluirMateriasEnVista = true
) => {
  const campoUsuario = {
    name: 'usuarioId',
    label: 'Usuario',
    type: 'select',
    opciones: usuariosOptions,
    required: false,
    disabled: modoEdicion,
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
      opciones: [{ value: 'DNI', label: 'DNI' }],
      required: true,
    },
    { name: 'dni', label: 'DNI', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true, disabled: emailDisabled },
    { name: 'direccion', label: 'Dirección', type: 'text', required: true },
    { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
    { name: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
    { name: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date', required: true },
  ];

  const campoMateriasVista = {
    name: 'dictados',
    label: 'Materias asignadas',
    render: (d) => {
      if (!d.dictados || d.dictados.length === 0) return 'Sin materias asignadas';
      return d.dictados.map(m => {
        const materia = m.materiaNombre || m.nombre;
        const curso = m.cursoNombre || m.curso;
        return `${materia} (${curso})`;
      }).join(', ');
    },
  };

  // Solo se agrega en modo vista si lo pedimos explícitamente
  if (modoVista) {
    return incluirMateriasEnVista ? [...camposBase, campoMateriasVista] : camposBase;
  }

  // En edición/creación nunca incluimos dictados → nunca editable
  return [campoUsuario, ...camposBase];
};