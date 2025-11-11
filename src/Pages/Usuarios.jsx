import TablaGenerica from '../Components/TablaLista';
import { useEffect, useMemo, useState } from 'react';
import { obtenerUsuarios, eliminarUsuario, registrarUsuario, actualizarUsuario } from '../Services/UsuarioService';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import BotonCrear from '../Components/Botones/BotonCrear';
import { camposUsuarioVista } from '../Entidades/camposUsuarioVista';
import { camposUsuario } from '../Entidades/camposUsuario';
import { useAuth } from '../Context/AuthContext';
import { toast } from 'react-toastify';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  // Filtro por rol (select)
  const [filtroRol, setFiltroRol] = useState('');
  const opcionesRol = [
    { value: '', label: 'Todos los roles' },
    { value: 'ROLE_ADMIN', label: 'Admin' },
    { value: 'ROLE_DIRECTOR', label: 'Director' },
    { value: 'ROLE_DOCENTE', label: 'Docente' },
    { value: 'ROLE_PRECEPTOR', label: 'Preceptor' },
    { value: 'ROLE_AUXILIAR', label: 'Auxiliar' },
  ];

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
        const raw = await obtenerUsuarios(token);
        // Adaptar distintos posibles formatos ya normalizados por el service (debería ser array)
        const lista = Array.isArray(raw) ? raw : [];
        if (!Array.isArray(raw)) {
          console.warn('Respuesta /user no es array. Valor crudo:', raw);
        }
        setUsuarios(lista);
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

  // Usamos loading dentro de la tabla para evitar romper el orden de hooks

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
          case 'ROLE_AUXILIAR': return 'Auxiliar';
          default: return 'Sin rol';
        }
      },
    },
  ];

  // Ordenado de usuarios
  const [orden, setOrden] = useState('RECIENTES'); // RECIENTES | ANTIGUOS | AZ | ZA

  const usuariosFiltradosPorRol = useMemo(() => {
    const base = filtroRol
      ? usuarios.filter(u => {
          const roleValue = typeof u.role === 'string' ? u.role : u.role?.name;
          return roleValue === filtroRol;
        })
      : usuarios;

    const nombreCompleto = (u) => `${u.name || ''} ${u.lastName || ''}`.trim();
    const byNombre = (a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es', { sensitivity: 'base' });
    const getTime = (u) => {
      const f = u.createdAt || u.fechaCreacion || u.created_on || null;
      if (f) {
        const t = Date.parse(f);
        if (!Number.isNaN(t)) return t;
      }
      return typeof u.id === 'number' ? u.id : 0;
    };
    const byFechaAsc = (a, b) => getTime(a) - getTime(b);
    const byFechaDesc = (a, b) => getTime(b) - getTime(a);

    const ordenada = [...base];
    switch (orden) {
      case 'AZ':
        ordenada.sort(byNombre);
        break;
      case 'ZA':
        ordenada.sort((a, b) => -byNombre(a, b));
        break;
      case 'ANTIGUOS':
        ordenada.sort(byFechaAsc);
        break;
      case 'RECIENTES':
      default:
        ordenada.sort(byFechaDesc);
        break;
    }
    return ordenada;
  }, [usuarios, filtroRol, orden]);

  return (
    <>
      <TablaGenerica
        titulo="Usuarios"
        columnas={columnasUsuarios}
        datos={usuariosFiltradosPorRol}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        camposFiltrado={['nombreApellido', 'email']}
        botonCrear={<BotonCrear texto="Crear usuario" onClick={abrirModalCrear} />}
        placeholderBuscador="Buscar por nombre o email"
        hideIdFilter={true}
        omitColumnFilters={['role']}
        leftControls={() => (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 160 }}
              value={filtroRol}
              onChange={e => setFiltroRol(e.target.value)}
            >
              {opcionesRol.map(op => (
                <option key={op.value || 'all'} value={op.value}>{op.label}</option>
              ))}
            </select>
            {filtroRol && (
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none"
                style={{ padding: '0 4px' }}
                onClick={() => setFiltroRol('')}
              >
                Limpiar
              </button>
            )}
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 180 }}
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            >
              <option value="RECIENTES">Más recientes</option>
              <option value="ANTIGUOS">Más antiguos</option>
              <option value="AZ">Alfabético (A-Z)</option>
              <option value="ZA">Alfabético (Z-A)</option>
            </select>
          </div>
        )}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={usuarioSeleccionado}
        campos={camposUsuarioVista}
        titulo="Detalle del Usuario"
        detallePathBase="usuarios"
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

