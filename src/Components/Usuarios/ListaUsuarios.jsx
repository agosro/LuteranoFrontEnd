import TablaGenerica from '../TablaLista';
import { useEffect, useState } from 'react';
import { obtenerUsuarios, eliminarUsuario } from '../../Services/UsuarioService';

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    async function fetchUsuarios() {
      try {
        const data = await obtenerUsuarios(token);
        setUsuarios(data);
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsuarios();
  }, [token]);

  const handleDelete = async (usuario) => {
    try {
      await eliminarUsuario(token, usuario.email);
      setUsuarios(prev => prev.filter(u => u.email !== usuario.email));
    } catch (error) {
      alert('Error al eliminar usuario');
      console.error(error);
    }
  };

  const handleView = (usuario) => alert(`Ver usuario: ${usuario.nombre} ${usuario.apellido}`);
  const handleEdit = (usuario) => alert('Editar usuario: ' + usuario.nombre);

  const handleCreate = () => {
    alert('Aquí abrís el formulario para crear un usuario');
  };

  if (loading) return <p>Cargando usuarios...</p>;

  const columnasUsuarios = [
    {
      key: 'nombreApellido',
      label: 'Nombre y Apellido',
      render: (u) => `${u.nombre} ${u.apellido}`,
    },
    { key: 'dni', label: 'DNI' },
    { key: 'email', label: 'Email' },
    { key: 'rol', label: 'Rol' },
  ];

  return (
    <TablaGenerica
      titulo="Lista de Usuarios"
      columnas={columnasUsuarios}
      datos={usuarios}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreate={handleCreate}
      textoCrear="Crear usuario"
    />
  );
}
