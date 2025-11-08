export const camposUsuario = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'lastName', label: 'Apellido', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Contraseña', type: 'password', required: true },
  {
    name: 'role',
    label: 'Rol',
    type: 'select',
    opciones: [
      { label: 'Admin', value: 'ROLE_ADMIN' },
      { label: 'Director', value: 'ROLE_DIRECTOR' },
      { label: 'Docente', value: 'ROLE_DOCENTE' },
      { label: 'Preceptor', value: 'ROLE_PRECEPTOR' },
      { label: 'Auxiliar', value: 'ROLE_AUXILIAR' },
    ],
    required: true,
  },
];

export default camposUsuario;