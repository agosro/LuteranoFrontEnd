//Para ver los datos de usuarios
export const camposUsuarioVista = [
  { name: 'name', label: 'Nombre' },
  { name: 'lastName', label: 'Apellido' },
  { name: 'email', label: 'Email' },
  {
    name: 'role',
    label: 'Rol',
    render: (datos) => {
      const roleName = datos.role?.name || '';
      switch (roleName) {
        case 'ROLE_ADMIN': return 'Admin';
        case 'ROLE_DIRECTOR': return 'Director';
        case 'ROLE_DOCENTE': return 'Docente';
        case 'ROLE_PRECEPTOR': return 'Preceptor';
        default: return 'Sin rol';
      }
    },
  },
];
