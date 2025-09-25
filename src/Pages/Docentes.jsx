import React, { useEffect, useState } from 'react';
import {
  listarDocentes,
  crearDocente,
  editarDocente,
  eliminarDocente,
} from '../Services/DocenteService';
import { obtenerUsuariosSinAsignarPorRol } from '../Services/UsuarioService';
import { camposDocente } from '../Entidades/camposDocente';
import { listarCursos } from '../Services/CursoService';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import TablaGenerica from '../Components/TablaLista';
import BotonCrear from '../Components/Botones/BotonCrear';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext';


export default function ListaDocentes() {
  const { user } = useAuth();
  const token = user?.token;

  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuariosOptions, setUsuariosOptions] = useState([]);

  // Estados separados para cada modal
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formData, setFormData] = useState({});

  // Función para extraer solo la parte YYYY-MM-DD de la fecha ISO
  const formatearFechaISO = (fecha) => {
    if (!fecha) return '';
    return fecha.split('T')[0];
  };

  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
  setLoading(true);
  try {
    const [docentesData, usuariosData, cursosData] = await Promise.all([
      listarDocentes(token),
      obtenerUsuariosSinAsignarPorRol(token, 'ROLE_DOCENTE'),
      listarCursos(token), // 👈 traemos cursos
    ]);

    // Enriquecer dictados de cada docente con nombre del curso
    const docentesConCursos = docentesData.map(doc => {
      const dictadosConCurso = (doc.dictados || []).map(d => {
        const curso = cursosData.find(c => c.id === d.cursoId);
        return {
          ...d,
          cursoNombre: curso ? `${curso.anio} ${curso.division}` : `Curso ${d.cursoId}`
        };
      });
      return { ...doc, dictados: dictadosConCurso };
    });

    setDocentes(docentesConCursos);

    const opcionesUsuarios = (usuariosData.usuarios || []).map(u => ({
      value: u.id,
      label: `${u.name} ${u.lastName} (${u.email})`,
      nombre: u.name,
      apellido: u.lastName,
      email: u.email,
    }));
    setUsuariosOptions(opcionesUsuarios);
  } catch (error) {
    toast.error('Error cargando datos: ' + error.message);
  } finally {
    setLoading(false);
  }
};

    cargarDatos();
  }, [token]);

  // Maneja cambio usuario en formData
  const handleUsuarioChange = (usuarioId) => {
    if (!usuarioId) {
      setFormData(prev => ({ ...prev, usuarioId: '', nombre: '', apellido: '', email: '' }));
      return;
    }
    const usuario = usuariosOptions.find(u => u.value === usuarioId);
    if (usuario) {
      setFormData(prev => ({
        ...prev,
        usuarioId: usuarioId,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      }));
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Abrir modales

  const abrirModalCrear = () => {
    setDocenteSeleccionado(null);
    setFormData({});
    setModalCrearShow(true);
  };

  const abrirModalEditar = (docente) => {
    setDocenteSeleccionado(docente);
    setFormData({
      id: docente.id,
      usuarioId: docente.user?.id || '',
      nombre: docente.nombre,
      apellido: docente.apellido,
      genero: docente.genero,
      tipoDoc: docente.tipoDoc || '',
      dni: docente.dni,
      email: docente.email,
      direccion: docente.direccion,
      telefono: docente.telefono,
      fechaNacimiento: formatearFechaISO(docente.fechaNacimiento),
      fechaIngreso: formatearFechaISO(docente.fechaIngreso),
    });
    setModalEditarShow(true);
  };

  const abrirModalVer = (docente) => {
    setDocenteSeleccionado(docente);
    setModalVerShow(true);
  };

  const abrirModalEliminar = (docente) => {
    setDocenteSeleccionado(docente);
    setModalEliminarShow(true);
  };

  // Cerrar modales

  const cerrarModalCrear = () => {
    setFormData({});
    setModalCrearShow(false);
  };

  const cerrarModalEditar = () => {
    setDocenteSeleccionado(null);
    setFormData({});
    setModalEditarShow(false);
  };

  const cerrarModalVer = () => {
    setDocenteSeleccionado(null);
    setModalVerShow(false);
  };

  const cerrarModalEliminar = () => {
    setDocenteSeleccionado(null);
    setModalEliminarShow(false);
  };

  // CRUD handlers


const handleCreate = async (datos) => {
  console.log('Enviar fechas:', datos.fechaNacimiento, datos.fechaIngreso);
console.log('Tipo fechaNacimiento:', typeof datos.fechaNacimiento);
console.log('Tipo fechaIngreso:', typeof datos.fechaIngreso);

  try {
    const nuevoDocente = {
      user: { id: datos.usuarioId },
      nombre: datos.nombre,
      apellido: datos.apellido,
      genero: datos.genero,
      tipoDoc: datos.tipoDoc || "DNI",
      dni: datos.dni,
      email: datos.email,
      direccion: datos.direccion,
      telefono: datos.telefono,
      fechaNacimiento: new Date(datos.fechaNacimiento).toISOString(),
      fechaIngreso: new Date(datos.fechaIngreso).toISOString(),
      materias: [],
    };


    const creadoResponse = await crearDocente(token, nuevoDocente);
    toast.success(creadoResponse.mensaje || "Docente creado con éxito");
    cerrarModalCrear();
    const docentesActualizados = await listarDocentes(token);
    setDocentes(docentesActualizados);
  } catch (error) {
    toast.error(error.message || "Error creando docente");
    console.error("Error al crear docente:", error);
  }
};

const handleUpdate = async (datos) => {
  try {
    const docenteEditado = {
      id: datos.id,
      user: { id: datos.usuarioId },
      nombre: datos.nombre,
      apellido: datos.apellido,
      genero: datos.genero,
      tipoDoc: datos.tipoDoc || "DNI",
      dni: datos.dni,
      email: datos.email,
      direccion: datos.direccion,
      telefono: datos.telefono,
      fechaNacimiento: new Date(datos.fechaNacimiento).toISOString(),
      fechaIngreso: new Date(datos.fechaIngreso).toISOString(),
    };

    const editResponse = await editarDocente(token, docenteEditado);
    toast.success(editResponse.mensaje || "Docente actualizado con éxito");
    cerrarModalEditar();
    const docentesActualizados = await listarDocentes(token);
    setDocentes(docentesActualizados);
  } catch (error) {
    toast.error(error.message || "Error al actualizar docente");
    console.error("Error al actualizar docente:", error);
  }
};

  const handleDelete = async () => {
    if (!docenteSeleccionado) return;

    try {
      await eliminarDocente(token, docenteSeleccionado.id);
      toast.success('Docente eliminado con éxito');
      cerrarModalEliminar();
      const docentesActualizados = await listarDocentes(token);
      setDocentes(docentesActualizados);
    } catch (error) {
      toast.error(error.message || 'Error eliminando docente');
    }
  };

  if (loading) return <p>Cargando docentes...</p>;

  const columnasDocentes = [
    {
      key: 'nombreApellido',
      label: 'Nombre y Apellido',
      render: d => `${d.nombre} ${d.apellido}`,
    },
    { key: 'dni', label: 'DNI' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    {
  key: 'dictados',
  label: 'Materias asignadas',
  render: d => {
    if (!d.dictados || d.dictados.length === 0) return 'Sin materias asignadas';

    return d.dictados
      .map(m => `${m.materiaNombre} (${m.cursoNombre})`)
      .join(', ');
  }
}
  ];

  // Aquí usamos la función para formatear las fechas antes de enviar a la vista
  const docenteVistaFormateado = docenteSeleccionado
    ? {
        ...docenteSeleccionado,
        fechaNacimiento: formatearFechaISO(docenteSeleccionado.fechaNacimiento),
        fechaIngreso: formatearFechaISO(docenteSeleccionado.fechaIngreso),
      }
    : null;

  return (
    <>
      <TablaGenerica
        titulo="Docentes"
        columnas={columnasDocentes}
        datos={docentes}
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
        onDelete={abrirModalEliminar}
        camposFiltrado={['nombreApellido', 'email']}
        botonCrear={<BotonCrear texto="Crear docente" onClick={abrirModalCrear} />}
        placeholderBuscador="Buscar por nombre o email"
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposDocente(usuariosOptions, false, false, !!formData.usuarioId)}
        formData={formData}
        onInputChange={handleInputChange}
        onUsuarioChange={handleUsuarioChange}
        onSubmit={handleCreate}
        titulo="Crear Docente"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarModalEditar}
        campos={camposDocente(usuariosOptions, false, true, true)}
        formData={formData}
        onInputChange={handleInputChange}
        onUsuarioChange={handleUsuarioChange}
        onSubmit={handleUpdate}
        titulo="Editar Docente"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={docenteVistaFormateado}
        campos={camposDocente([], true)} // modoVista = true para campos solo lectura
        titulo={`Datos del docente: ${docenteSeleccionado?.nombre} ${docenteSeleccionado?.apellido}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={docenteSeleccionado}
        tipo="docente"
      />
    </>
  );
}