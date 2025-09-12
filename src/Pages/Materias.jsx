import { useState, useCallback, useEffect } from 'react';
import TablaGenerica from '../Components/TablaLista';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import BotonCrear from '../Components/Botones/BotonCrear';
import { useAuth } from '../Context/AuthContext';
import { toast } from 'react-toastify';
import { FaUserTie } from 'react-icons/fa';

import {
  listarMaterias,
  crearMateria,
  actualizarMateria,
  eliminarMateria
} from '../Services/MateriaService';

import { listarCursos } from '../Services/CursoService';
import { camposMateria } from '../Entidades/camposMateria';

// 🆕 imports para asignar docente
import ModalSeleccionSimple from '../Components/Modals/ModalSeleccionSimple';
import { listarDocentes } from '../Services/DocenteService';
import { asignarDocente, desasignarDocente, listarCursosDeMateria } from '../Services/MateriaCursoService';

export default function ListaMaterias() {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  const { user } = useAuth();
  const token = user?.token;

  // Estado para crear materia
  const [formDataCrear, setFormDataCrear] = useState({
    nombreMateria: "",
    descripcion: "",
    nivel: "",
  });

  const handleInputChangeCrear = (name, value) => {
    setFormDataCrear(prev => ({ ...prev, [name]: value }));
  };

  // Estado para editar materia
  const [formDataEditar, setFormDataEditar] = useState({});
  const handleInputChangeEditar = (name, value) => {
    setFormDataEditar(prev => ({ ...prev, [name]: value }));
  };

  // 🆕 Estado para modal de asignar docente
  const [modalAsignarDocenteShow, setModalAsignarDocenteShow] = useState(false);
  const [materiaParaAsignar, setMateriaParaAsignar] = useState(null);

  const abrirModalAsignarDocente = (materia) => {
    setMateriaParaAsignar(materia);
    setModalAsignarDocenteShow(true);
  };

  const cerrarModalAsignarDocente = () => {
    setMateriaParaAsignar(null);
    setModalAsignarDocenteShow(false);
  };

  // 🆕 Carga de materias con curso y docente
  const cargarMaterias = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  try {
    const [materiasData, cursosData] = await Promise.all([
      listarMaterias(token),
      listarCursos(token), // 👈 traemos todos los cursos para cruzar
    ]);

    const materiasConCurso = await Promise.all(
      materiasData.map(async (m) => {
        try {
          const cursosDeMateria = await listarCursosDeMateria(token, m.id);

          if (Array.isArray(cursosDeMateria) && cursosDeMateria.length > 0) {
            const mc = cursosDeMateria[0]; // tomo el primero
            const cursoEncontrado = cursosData.find(c => c.id === mc.cursoId);

            const cursoNombre = cursoEncontrado
              ? `${cursoEncontrado.anio} ${cursoEncontrado.division}`
              : `Curso ${mc.cursoId}`;

            const docenteNombre = mc.docente
              ? `${mc.docente.nombre} ${mc.docente.apellido}`
              : "Sin docente";

            return {
              ...m,
              cursoId: mc.cursoId,
              cursoNombre,
              docente: mc.docente || null,
              docenteNombre,
            };
          }

          return { 
            ...m, 
            cursoId: null, 
            cursoNombre: "Sin curso", 
            docente: null, 
            docenteNombre: "Sin docente" 
          };
        } catch (error) {
          console.error(`Error cargando cursos de la materia ${m.id}:`, error);
          return { 
            ...m, 
            cursoId: null, 
            cursoNombre: "Sin curso", 
            docente: null, 
            docenteNombre: "Sin docente" 
          };
        }
      })
    );

    setMaterias(materiasConCurso);
  } catch (error) {
    toast.error("Error cargando materias: " + error.message);
  } finally {
    setLoading(false);
  }
}, [token]);

  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  // Crear materia
  const handleCreate = async (nuevaMateria) => {
    try {
      const creadoResponse = await crearMateria(token, nuevaMateria);
      toast.success(creadoResponse.mensaje || 'Materia creada con éxito');
      setModalCrearShow(false);
      setFormDataCrear({ nombreMateria: "", descripcion: "", nivel: "" });
      cargarMaterias();
    } catch (error) {
      toast.error(error.message || 'Error creando materia');
      console.error(error);
    }
  };

  // Editar materia
  const handleUpdate = async (materiaEditada) => {
    try {
      const editResponse = await actualizarMateria(token, materiaEditada);
      toast.success(editResponse.mensaje || 'Materia actualizada con éxito');
      setModalEditarShow(false);
      setMateriaSeleccionada(null);
      cargarMaterias();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar materia');
      console.error(error);
    }
  };

  // Eliminar materia
  const handleDeleteClick = (materia) => {
    setMateriaSeleccionada(materia);
    setMostrarModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    try {
      await eliminarMateria(token, materiaSeleccionada.id);
      setMaterias(prev => prev.filter(m => m.id !== materiaSeleccionada.id));
      toast.success('Materia eliminada con éxito');
    } catch (error) {
      toast.error('Error al eliminar materia');
      console.error(error);
    } finally {
      setMostrarModalEliminar(false);
    }
  };

  const handleView = (materia) => {
    setMateriaSeleccionada(materia);
    setModalVerShow(true);
  };

  const handleEdit = (materia) => {
    setMateriaSeleccionada(materia);
    setFormDataEditar({
      nombreMateria: materia.nombreMateria || '',
      descripcion: materia.descripcion || '',
      nivel: materia.nivel || ''
    });
    setModalEditarShow(true);
  };

  if (loading) return <p>Cargando materias...</p>;

  const columnasMaterias = [
    { key: 'nombreMateria', label: 'Nombre de la materia' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'nivel',
      label: 'Nivel',
      render: (m) => m.nivel ?? 'Sin nivel',
    },
    {
      key: 'curso',
      label: 'Curso',
      render: (m) => m.cursoNombre ?? "Sin curso",
    },
    {
      key: 'docente',
      label: 'Docente',
      render: (m) => m.docente ? `${m.docente.nombre} ${m.docente.apellido}` : "Sin docente"
    }
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Materias"
        columnas={columnasMaterias}
        datos={materias}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        camposFiltrado={['nombreMateria', 'descripcion']}
        botonCrear={<BotonCrear texto="Crear materia" onClick={() => setModalCrearShow(true)} />}
        placeholderBuscador="Buscar por nombre o descripción"
        extraButtons={(materia) => [
          {
            icon: <FaUserTie />,
            onClick: () => abrirModalAsignarDocente(materia),
            title: "Asignar Docente",
          }
        ]}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={materiaSeleccionada}
        campos={camposMateria(true)}
        titulo="Detalle de la Materia"
      />

      <ConfirmarEliminar
        show={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={confirmarEliminar}
        item={materiaSeleccionada}
        tipo="materia"
      />

      {/* Modal Editar */}
      {materiaSeleccionada && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={() => setModalEditarShow(false)}
          datosIniciales={materiaSeleccionada}
          formData={formDataEditar}
          campos={camposMateria(false)}
          onInputChange={handleInputChangeEditar}
          onSubmit={handleUpdate}
        />
      )}

      {/* Modal Crear */}
      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposMateria(false)}
        onSubmit={handleCreate}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        titulo="Crear Materia"
      />

      {/* 🆕 Modal Asignar Docente */}
      <ModalSeleccionSimple
        show={modalAsignarDocenteShow}
        onClose={cerrarModalAsignarDocente}
        titulo={`Asignar docente a ${materiaParaAsignar?.nombreMateria}`}
        entidad={materiaParaAsignar}
        campoAsignado="docente"
        obtenerOpciones={async (token) => {
          const data = await listarDocentes(token);
          return data.map(d => ({ value: d.id, label: `${d.nombre} ${d.apellido}` }));
        }}
        onAsignar={(token, docenteId, materiaId) =>
          asignarDocente(token, materiaId, materiaParaAsignar.cursoId, docenteId)
        }
        onDesasignar={(token, materiaId) =>
          desasignarDocente(token, materiaId, materiaParaAsignar.cursoId)
        }
        token={token}
        onActualizar={cargarMaterias}
      />
    </>
  );
}