//Para ver los datos de usuarios
export const camposUsuarioVista = [
  { name: 'name', label: 'Nombre' },
  { name: 'lastName', label: 'Apellido' },
  { name: 'email', label: 'Email' },
  {
    name: 'role',
    label: 'Rol',
    render: (valor) => {
      // En el modal se pasa el valor del campo ('role'), no el objeto completo
      const roleName = typeof valor === 'string' ? valor : (valor?.name || '');
      switch (roleName) {
        case 'ROLE_ADMIN': return 'Admin';
        case 'ROLE_DIRECTOR': return 'Director';
        case 'ROLE_DOCENTE': return 'Docente';
        case 'ROLE_PRECEPTOR': return 'Preceptor';
        case 'ROLE_AUXILIAR': return 'Auxiliar';
        default: return 'Sin rol';
      }
    },
  },
];
