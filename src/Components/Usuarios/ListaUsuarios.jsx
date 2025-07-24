import TablaGenerica from '../TablaLista';
import { useEffect, useState } from 'react';
import { obtenerUsuarios, eliminarUsuario, registrarUsuario, actualizarUsuario } from '../../Services/UsuarioService';
import ModalVerEntidad from '../ModalVerEntidad';
import ModalEditarEntidad from '../ModalEditarEntidad';
import { useAuth } from '../../Context/AuthContext';

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);

  // Obtengo token del contexto de auth (recomendado)
  const { user } = useAuth();
  const token = user?.token;

  useEffect(() => {
    async function fetchUsuarios() {
      if (!token) return; // Si no hay token no intento
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

  const handleView = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalVerShow(true);
  };

  const handleEdit = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEditarShow(true);
  };

  const handleUpdate = async (datosEditados) => {
    try {
      await actualizarUsuario(token, datosEditados); 
      setUsuarios((prev) =>
        prev.map((u) => (u.email === datosEditados.email ? datosEditados : u))
      );
      alert('Usuario actualizado con éxito');
      setModalEditarShow(false);
      setUsuarioSeleccionado(null);
    } catch (error) {
      alert('Error al actualizar usuario');
      console.error(error);
    }
  };

  // Aquí no paso token al registrarUsuario porque es endpoint público
  const handleCreate = async (datosNuevoUsuario) => {
    try {
      const usuarioCreado = await registrarUsuario(datosNuevoUsuario);
      setUsuarios(prev => [...prev, usuarioCreado]);
      alert('Usuario creado con éxito');
    } catch (error) {
      alert('Error al crear usuario');
      console.error(error);
    }
  };

  if (loading) return <p>Cargando usuarios...</p>;

  const rolesDisponibles = [
    { label: 'Admin', value: 'ROLE_ADMIN' },
    { label: 'Director', value: 'ROLE_DIRECTOR' },
    { label: 'Docente', value: 'ROLE_DOCENTE' },
    { label: 'Preceptor', value: 'ROLE_PRECEPTOR' },
  ];

  const columnasUsuarios = [
    {
      key: 'nombreApellido',
      label: 'Nombre y Apellido',
      render: (u) => `${u.nombre} ${u.apellido}`,
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Rol',
      render: (u) => {
        const roleValue = typeof u.role === 'string' ? u.role : u.role?.name || '';
        switch (roleValue) {
          case 'ROLE_ADMIN': return 'Admin';
          case 'ROLE_DIRECTOR': return 'Director';
          case 'ROLE_DOCENTE': return 'Docente';
          case 'ROLE_PRECEPTOR': return 'Preceptor';
          default: return 'Sin rol';
        }
      },
    },
  ];

  const camposUsuario = [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'apellido', label: 'Apellido', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'password', label: 'Contraseña', type: 'password' },
    {
      name: 'role',
      label: 'Rol',
      type: 'select',
      opciones: rolesDisponibles,
    },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Usuarios"
        columnas={columnasUsuarios}
        datos={usuarios}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        textoCrear="Crear usuario"
        campos={camposUsuario}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={usuarioSeleccionado}
        campos={camposUsuario}
        titulo="Detalle del Usuario"
      />

      {usuarioSeleccionado && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={() => setModalEditarShow(false)}
          datosIniciales={usuarioSeleccionado}
          campos={camposUsuario}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
}