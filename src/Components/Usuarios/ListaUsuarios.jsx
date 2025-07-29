import TablaGenerica from '../TablaLista';
import { useEffect, useState } from 'react';
import { obtenerUsuarios, eliminarUsuario, registrarUsuario, actualizarUsuario } from '../../Services/UsuarioService';
import ModalVerEntidad from '../Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Modals/ModalCrear';
import ConfirmarEliminar from '../Modals/ConfirmarEliminar';
import BotonCrear from '../Botones/BotonCrear';
import { camposUsuarioVista } from '../../Entidades/camposUsuarioVista';
import { camposUsuario } from '../../Entidades/camposUsuario';
import { useAuth } from '../../Context/AuthContext';
import { toast } from 'react-toastify';

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  // Obtengo token del contexto de auth (recomendado)
  const { user } = useAuth();
  const token = user?.token;

  useEffect(() => {
    async function fetchUsuarios() {
      if (!token) return;
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

  const handleDeleteClick = (usuario) => {
  setUsuarioSeleccionado(usuario);
  setMostrarModalEliminar(true);
};

const confirmarEliminar = async () => {
  try {
    await eliminarUsuario(token, usuarioSeleccionado.email);
    setUsuarios((prev) => prev.filter((u) => u.email !== usuarioSeleccionado.email));
    toast.success("Usuario eliminado con éxito");
  } catch (error) {
    toast.error("Error al eliminar usuario");
    console.error(error);
  } finally {
    setMostrarModalEliminar(false);
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
      const usuarioActualizado = await actualizarUsuario(token, datosEditados);
      setUsuarios(prev =>
        prev.map(u => (u.id === usuarioActualizado.id ? usuarioActualizado : u))
      );
      toast.success(usuarioActualizado.mensaje || 'Usuario actualizado con éxito');
      setModalEditarShow(false);
      setUsuarioSeleccionado(null);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar usuario');
      console.error(error);
    }
  };

  // Maneja la creación y cierra el modal + actualiza la lista
    const handleCreate = async (datosNuevoUsuario) => {
    try {
      const usuarioCreado = await registrarUsuario(token, datosNuevoUsuario);
      setUsuarios(prev => [...prev, usuarioCreado]);
      toast.success(usuarioCreado.mensaje || 'Usuario creado con éxito');
      setModalCrearShow(false);
    } catch (error) {
      toast.error(error.message || 'Error desconocido al crear usuario');
      console.error(error);
    }
  };

  if (loading) return <p>Cargando usuarios...</p>;

  const columnasUsuarios = [
    {
      key: 'nombreApellido',
      label: 'Nombre y Apellido',
      render: (u) => `${u.name || ''} ${u.lastName || ''}`,
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

  return (
    <>
      <TablaGenerica
        titulo="Usuarios"
        columnas={columnasUsuarios}
        datos={usuarios}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        botonCrear={<BotonCrear texto="Crear usuario" onClick={() => setModalCrearShow(true)} />}
        placeholderBuscador="Buscar por nombre o email"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={usuarioSeleccionado}
        campos={camposUsuarioVista}
        titulo="Detalle del Usuario"
      />

      <ConfirmarEliminar
        show={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={confirmarEliminar}
        item={usuarioSeleccionado}
        tipo="usuario"
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

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposUsuario}
        onSubmit={handleCreate}
        titulo="Crear Usuario"
      />
    </>
  );
}