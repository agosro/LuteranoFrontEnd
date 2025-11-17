import React, { useEffect, useState } from 'react';
import {
  listarDocentes,
  crearDocente,
  eliminarDocente,
} from '../Services/DocenteService';
import { obtenerUsuariosSinAsignarPorRol } from '../Services/UsuarioService';
import { camposDocente } from '../Entidades/camposDocente';
import { listarCursos } from '../Services/CursoService';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import TablaGenerica from '../Components/TablaLista';
import BotonCrear from '../Components/Botones/BotonCrear';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext';
import { inputLocalToBackendISO } from "../utils/fechas";


export default function ListaDocentes() {
  const { user } = useAuth();
  const token = user?.token;

  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuariosOptions, setUsuariosOptions] = useState([]);

  // Estados separados para cada modal
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formData, setFormData] = useState({});


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
      fechaNacimiento: inputLocalToBackendISO(datos.fechaNacimiento),
      fechaIngreso: inputLocalToBackendISO(datos.fechaIngreso),
      materias: [],
    };

    const creadoResponse = await crearDocente(token, nuevoDocente);
    toast.success(creadoResponse.mensaje || "Docente creado con éxito");
    cerrarModalCrear();
    const docentesActualizados = await listarDocentes(token);
    setDocentes(docentesActualizados);
  } catch (error) {
    // Mostrar mensaje general
    toast.error(error.message || "Error creando docente");
    // Mostrar mensajes de validación de campos si existen
    if (error.data && error.data.errors) {
      Object.entries(error.data.errors).forEach(([campo, mensaje]) => {
        toast.error(`${campo}: ${mensaje}`);
      });
    }
    console.error("Error al crear docente:", error);
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
  ];

  // En vista usamos el formateo centralizado (VistaEntidad/RenderCampos -> isoToDisplay)
  const docenteVistaFormateado = docenteSeleccionado || null;

  // Campos a mostrar en el modal de VER (vista resumida) para Docentes
  const camposDocenteVistaModal = [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'apellido', label: 'Apellido', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'telefono', label: 'Teléfono', type: 'text' },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Docentes"
        columnas={columnasDocentes}
        datos={docentes}
        onView={abrirModalVer}
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

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={docenteVistaFormateado}
        campos={camposDocenteVistaModal}
        titulo={`Datos del docente: ${docenteSeleccionado?.nombre} ${docenteSeleccionado?.apellido}`}
        detallePathBase="docentes"
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