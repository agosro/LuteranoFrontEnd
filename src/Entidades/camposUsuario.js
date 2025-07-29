//Para crear o editar usuarios
export const camposUsuario = [
  { name: 'name', label: 'Nombre', type: 'text' },
  { name: 'lastName', label: 'Apellido', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Contraseña', type: 'password' },
  {
    name: 'role',
    label: 'Rol',
    type: 'select',
    opciones: [
      { label: 'Admin', value: 'ROLE_ADMIN' },
      { label: 'Director', value: 'ROLE_DIRECTOR' },
      { label: 'Docente', value: 'ROLE_DOCENTE' },
      { label: 'Preceptor', value: 'ROLE_PRECEPTOR' },
    ],
    render: (datos) => {
      // Si es objeto (como en vista), mostrar label; si es string (como en formulario), devolver directamente
      const valor = typeof datos.role === 'string' ? datos.role : datos.role?.name;
      const opcion = camposUsuario[3].opciones.find(op => op.value === valor);
      return opcion ? opcion.label : valor;
    }
  }
];

export default camposUsuario;
