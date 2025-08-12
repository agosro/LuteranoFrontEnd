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

  // Estado para el formulario (crear y editar)
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
  });

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

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const abrirModalCrear = () => {
    setFormData({
      id: null,
      name: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
    });
    setModalCrearShow(true);
  };

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
      // Si viene del backend con response.data.mensaje, usarlo
      const mensaje = error.response?.data?.mensaje || "Error al eliminar usuario";
      toast.error(mensaje);
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
    setFormData({
      id: usuario.id,
      name: usuario.name || '',
      lastName: usuario.lastName || '',
      email: usuario.email || '',
      password: '', // no mostrar la contraseña al editar
      role: typeof usuario.role === 'string' ? usuario.role : usuario.role?.name || '',
    });
    setModalEditarShow(true);
  };

  // Ahora no recibe parámetros, usa el estado formData directamente
  const handleUpdate = async () => {
    const datosParaEnviar = { ...formData };

    // Si la contraseña está vacía, la eliminamos para no enviarla
    if (!datosParaEnviar.password || datosParaEnviar.password.trim() === '') {
      delete datosParaEnviar.password;
    }

    console.log("Datos que se envían a actualizar:", datosParaEnviar);

    try {
      const usuarioActualizado = await actualizarUsuario(token, datosParaEnviar);
      setUsuarios(prev =>
        prev.map(u => (u.id === usuarioActualizado.id ? usuarioActualizado : u))
      );
      toast.success(usuarioActualizado.mensaje || 'Usuario actualizado con éxito');
      setModalEditarShow(false);
      setUsuarioSeleccionado(null);
      setFormData({
        id: null,
        name: '',
        lastName: '',
        email: '',
        password: '',
        role: '',
      });
    } catch (error) {
      toast.error(error.message || 'Error al actualizar usuario');
      console.error(error);
    }
  };

  const handleCreate = async (datosNuevoUsuario) => {
  try {
    const response = await registrarUsuario(token, datosNuevoUsuario);
    toast.success(response.mensaje || 'Usuario creado con éxito');

    // Refrescar lista completa porque backend no devuelve el usuario creado
    const usuariosActualizados = await obtenerUsuarios(token);
    setUsuarios(usuariosActualizados);

    setModalCrearShow(false);
    setFormData({
      id: null,
      name: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
    });
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
        titulo="Lista de Usuarios"
        columnas={columnasUsuarios}
        datos={usuarios}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        botonCrear={<BotonCrear texto="Crear usuario" onClick={abrirModalCrear} />}
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
          formData={formData}
          onInputChange={handleInputChange}
          onSubmit={handleUpdate} // Sin parámetro, usa formData interno
        />
      )}

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposUsuario}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleCreate}
        titulo="Crear Usuario"
      />
    </>
  );
}