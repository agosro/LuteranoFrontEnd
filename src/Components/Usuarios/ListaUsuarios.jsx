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
      roleId: null
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
    // Obtenemos el mensaje real del backend
    let mensaje = "Error al eliminar usuario";

    if (error.response) {
      // Si viene un objeto de error con mensaje
      if (error.response.data?.mensaje) {
        mensaje = error.response.data.mensaje;
      } else if (typeof error.response.data === "string") {
        // Si el backend devuelve un string plano
        mensaje = error.response.data;
      } else if (error.response.data?.errors) {
        // Si devuelve errores por campos
        mensaje = Object.values(error.response.data.errors).join(", ");
      }
    } else if (error.message) {
      mensaje = error.message;
    }

    toast.error(mensaje); // <-- Aquí se muestra en el toast
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
      role: usuario.role?.name || '',
      roleId: usuario.role?.id || null,
    });
    setModalEditarShow(true);
  };

  const handleUpdate = async () => {
      // Validación local
  if (formData.password && formData.password.length < 5) {
    toast.error("La contraseña debe tener como mínimo 5 caracteres");
    return; // no enviar al backend
  }
  // Armamos el payload con el formato que el backend espera
  const datosParaEnviar = {
    id: formData.id,
    name: formData.name,
    lastName: formData.lastName,
    email: formData.email,
    ...(formData.password?.trim() ? { password: formData.password } : {}),
    rol: formData.role, // Enviamos solo el nombre del rol como string
    userStatus: formData.userStatus || undefined // opcional
  };

  try {
    // Actualizamos el usuario en el backend
    await actualizarUsuario(token, datosParaEnviar);

    // Refrescamos la lista completa de usuarios para que la tabla se actualice
    const usuariosActualizados = await obtenerUsuarios(token);
    setUsuarios(usuariosActualizados);

    toast.success('Usuario actualizado con éxito');
    setModalEditarShow(false);
    setUsuarioSeleccionado(null);

    // Limpiamos el formulario
    setFormData({
      id: null,
      name: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
      roleId: null,
      userStatus: ''
    });
  } catch (error) {
     // Primero intentamos mostrar el mensaje de validación específico
  const mensajeBackend =
    error.response?.data?.errors?.password ||  // mensaje del campo password
    error.response?.data?.mensaje ||          // mensaje general
    error.message || 
    'Error desconocido al actualizar usuario';

  toast.error(mensajeBackend);
  console.error(error);
}
};

  const handleCreate = async () => {
      // Validación local
  if (formData.password && formData.password.length < 5) {
    toast.error("La contraseña debe tener como mínimo 5 caracteres");
    return; // no enviar al backend
  }
  // Armamos el payload según lo que espera el backend
  const datosParaEnviar = {
    name: formData.name,
    lastName: formData.lastName,
    email: formData.email,
    password: formData.password,
    role: formData.role // ⚠️ Debe ser exactamente uno de los enum: "ROLE_ADMIN", etc.
  };

  console.log("ENVIANDO CREAR:", datosParaEnviar);

  try {
    const response = await registrarUsuario(token, datosParaEnviar);
    toast.success(response.mensaje || 'Usuario creado con éxito');

    // Refrescamos la tabla
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
      roleId: null
    });
  } catch (error) {
  let mensaje = "Error desconocido al crear usuario";

  if (error.response) {
    // Si viene un error de validación por campos
    if (error.response.data?.errors) {
      mensaje = Object.values(error.response.data.errors).join(", ");
    } else if (error.response.data?.mensaje) {
      mensaje = error.response.data.mensaje;
    } else if (typeof error.response.data === "string") {
      mensaje = error.response.data;
    }
  } else if (error.message) {
    mensaje = error.message;
  }

  toast.error(mensaje);
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