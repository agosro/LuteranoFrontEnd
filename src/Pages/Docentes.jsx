import { useEffect, useState } from 'react';
import TablaGenerica from '../Components/TablaLista';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import BotonCrear from '../Components/Botones/BotonCrear';
import { useAuth } from '../Context/AuthContext';
import { toast } from 'react-toastify';

import {
  listarDocentes,
  crearDocente,
  editarDocente,
  eliminarDocente,
  asignarMateriasADocente,
  desasignarMateriasDeDocente,
} from '../Services/DocenteService';

import { listarMaterias } from '../Services/MateriaService';  // Debés tener este servicio para traer materias
import { obtenerUsuarios } from '../Services/UsuarioService'; // Servicio para traer usuarios no asignados

import { camposDocente } from '../Entidades/camposDocente';

export default function ListaDocentes() {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [materiasOptions, setMateriasOptions] = useState([]);
  const [usuariosOptions, setUsuariosOptions] = useState([]);

  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  const { user } = useAuth();
  const token = user?.token;

  // Cargar docentes, materias y usuarios disponibles
  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [docentesData, materiasData, usuariosData] = await Promise.all([
          listarDocentes(token),
          listarMaterias(token),
          obtenerUsuarios(token),
        ]);

        setDocentes(docentesData);

        // Preparar opciones para selects (materias)
        const opcionesMaterias = materiasData.map(m => ({ value: m.id, label: m.nombre }));
        setMateriasOptions(opcionesMaterias);

        // Opciones usuarios (id y label nombre+email)
        const opcionesUsuarios = usuariosData.map(u => ({
          value: u.id,
          label: `${u.nombre} ${u.apellido} (${u.email})`
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

  // Crear docente con materias y usuario asignado
  const handleCreate = async (nuevoDocente) => {
    try {
      // Crear docente (sin materias aún)
      const creadoResponse = await crearDocente(token, {
        ...nuevoDocente,
        materiasIds: undefined, // no mandar acá materias en el create si backend no lo espera
      });

      const docenteCreado = creadoResponse.docente;

      // Asignar materias si seleccionadas
      if (nuevoDocente.materiasIds?.length > 0) {
        await asignarMateriasADocente(token, docenteCreado.id, nuevoDocente.materiasIds);
      }

      // Refrescar lista
      const docentesActualizados = await listarDocentes(token);
      setDocentes(docentesActualizados);

      toast.success(creadoResponse.mensaje || 'Docente creado con éxito');
      setModalCrearShow(false);
    } catch (error) {
      toast.error(error.message || 'Error creando docente');
      console.error(error);
    }
  };

  // Editar docente con asignación/desasignación de materias y cambio de usuario
  const handleUpdate = async (datosEditados) => {
    try {
      // Primero obtener el docente original para comparar materias y usuario
      const docenteOriginal = docentes.find(d => d.id === datosEditados.id);
      if (!docenteOriginal) throw new Error('Docente no encontrado para actualizar');

      // Editar datos generales (sin materias ni usuario)
      const editResponse = await editarDocente(token, {
        ...datosEditados,
        materiasIds: undefined,
        usuarioId: undefined,
      });

      // Comparar materias
      const materiasPrevias = (docenteOriginal.materiasAsignadas || []).map(m => m.id);
      const materiasNuevas = datosEditados.materiasIds || [];

      // Materias a asignar y desasignar
      const materiasAAsignar = materiasNuevas.filter(id => !materiasPrevias.includes(id));
      const materiasADesasignar = materiasPrevias.filter(id => !materiasNuevas.includes(id));

      if (materiasAAsignar.length) {
        await asignarMateriasADocente(token, datosEditados.id, materiasAAsignar);
      }
      if (materiasADesasignar.length) {
        await desasignarMateriasDeDocente(token, datosEditados.id, materiasADesasignar);
      }

      // Manejo de usuario asignado: si cambió, hacer la lógica correspondiente en backend o con otro endpoint
      // Por simplicidad asumo que el backend maneja el cambio de usuario en editarDocente

      // Refrescar lista
      const docentesActualizados = await listarDocentes(token);
      setDocentes(docentesActualizados);

      toast.success(editResponse.mensaje || 'Docente actualizado con éxito');
      setModalEditarShow(false);
      setDocenteSeleccionado(null);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar docente');
      console.error(error);
    }
  };

  const handleDeleteClick = (docente) => {
    setDocenteSeleccionado(docente);
    setMostrarModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    try {
      await eliminarDocente(token, docenteSeleccionado.id);
      setDocentes(prev => prev.filter(d => d.id !== docenteSeleccionado.id));
      toast.success('Docente eliminado con éxito');
    } catch (error) {
      toast.error('Error al eliminar docente');
      console.error(error);
    } finally {
      setMostrarModalEliminar(false);
    }
  };

  const handleView = (docente) => {
    setDocenteSeleccionado(docente);
    setModalVerShow(true);
  };

  const handleEdit = (docente) => {
    setDocenteSeleccionado(docente);
    setModalEditarShow(true);
  };

  if (loading) return <p>Cargando docentes...</p>;

  // Columnas para TablaGenerica
  const columnasDocentes = [
    {
      key: 'nombreApellido',
      label: 'Nombre y Apellido',
      render: (d) => `${d.nombre} ${d.apellido}`,
    },
    { key: 'dni', label: 'DNI' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    {
      key: 'materias',
      label: 'Materias',
      render: (d) =>
        d.materiasAsignadas?.length > 0
          ? d.materiasAsignadas.map(m => m.nombre).join(', ')
          : 'Sin asignar',
    },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Docentes"
        columnas={columnasDocentes}
        datos={docentes}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        botonCrear={<BotonCrear texto="Crear docente" onClick={() => setModalCrearShow(true)} />}
        placeholderBuscador="Buscar por nombre, DNI o email"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={docenteSeleccionado}
        campos={camposDocente(materiasOptions, usuariosOptions)}
        titulo="Detalle del Docente"
      />

      <ConfirmarEliminar
        show={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={confirmarEliminar}
        item={docenteSeleccionado}
        tipo="docente"
      />

      {docenteSeleccionado && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={() => setModalEditarShow(false)}
          datosIniciales={{
            ...docenteSeleccionado,
            materiasIds: docenteSeleccionado.materiasAsignadas?.map(m => m.id) || [],
            usuarioId: docenteSeleccionado.usuario?.id || '',
          }}
          campos={camposDocente(materiasOptions, usuariosOptions)}
          onSubmit={handleUpdate}
        />
      )}

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposDocente(materiasOptions, usuariosOptions)}
        onSubmit={handleCreate}
        titulo="Crear Docente"
      />
    </>
  );
}