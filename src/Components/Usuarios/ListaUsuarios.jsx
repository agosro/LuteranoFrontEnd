import TablaGenerica from '../TablaLista';
import { useEffect, useState } from 'react';
import { obtenerUsuarios, eliminarUsuario, registrarUsuario } from '../../Services/UsuarioService';
import ModalVerEntidad from '../ModalVerEntidad';
import ModalEditarEntidad from '../ModalEditarEntidad';

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
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

  const handleView = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalVerShow(true);
  };

   // Función para abrir modal de editar y setear usuario
  const handleEdit = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEditarShow(true);
  };

  // Función para enviar datos editados al backend
  const handleUpdate = async (datosEditados) => {
    try {
      // suponiendo que tienes un servicio para actualizar usuario:
      await actualizarUsuario(token, datosEditados.email, datosEditados); 
      // Actualizás el estado local para reflejar cambios
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

  // Aquí recibimos los datos del formulario de creación
  const handleCreate = async (datosNuevoUsuario) => {
    try {
      // Llamás al servicio para crear el usuario
      const usuarioCreado = await registrarUsuario(token, datosNuevoUsuario);
      // Actualizás la lista con el nuevo usuario
      setUsuarios(prev => [...prev, usuarioCreado]);
      alert('Usuario creado con éxito');
    } catch (error) {
      alert('Error al crear usuario');
      console.error(error);
    }
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
    {
      key: 'estado',
      label: 'Estado',
      render: (u) => (
        <div className="text-center">
          <span className={`badge ${u.estado === true || u.estado === 'activo' ? 'bg-success' : 'bg-secondary'}`}>
            {u.estado === true || u.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
  ];

  // Definís los campos que querés que se muestren en el modal crear usuario
  const camposUsuario = [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'apellido', label: 'Apellido', type: 'text' },
    { name: 'dni', label: 'DNI', type: 'text' },
    { name: 'rol', label: 'Rol', type: 'select', opciones: ['Admin', 'Director', 'Docente', 'Preceptor' ] },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'password', label: 'Contraseña', type: 'password' },
    { name: 'activo', label: 'Activo', type: 'checkbox' }, // <-- campo para estado
    
    
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