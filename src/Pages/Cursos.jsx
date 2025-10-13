import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../Context/AuthContext";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { camposCurso } from "../Entidades/camposCurso";
import { listarCursos, crearCurso, editarCurso, eliminarCurso } from "../Services/CursoService";
import { listarAulas, listarAulasLibres } from "../Services/AulaService";
import { listarMaterias } from "../Services/MateriaService";

// 🆕 imports para asignar materias
import ModalAsignacionGenerico from "../Components/Modals/ModalAsignar";
import { asignarMateriasACurso, quitarMateriasDeCurso, listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { FaBook, FaUserTie, FaClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// 🆕 imports para asignar preceptor
import ModalSeleccionSimple from "../Components/Modals/ModalSeleccionSimple";
import { listarPreceptores } from "../Services/PreceptorService";
import { asignarPreceptorACurso, desasignarPreceptorDeCurso } from "../Services/PreceptorCursoService";

export default function ListaCursos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token;

  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aulasOptions, setAulasOptions] = useState([]);
  const [materiasOptions, setMateriasOptions] = useState([]);

  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);
  const [formData, setFormData] = useState({});

  // 🆕 estado para el modal de asignar materias
  const [modalAsignarMateriasShow, setModalAsignarMateriasShow] = useState(false);
  const [cursoParaAsignar, setCursoParaAsignar] = useState(null);

  // 🆕 estado para el modal de asignar preceptor
  const [modalAsignarPreceptorShow, setModalAsignarPreceptorShow] = useState(false);
  const [cursoParaAsignarPreceptor, setCursoParaAsignarPreceptor] = useState(null);

  const [ordenAsc, setOrdenAsc] = useState(true); // nuevo estado para ordering

  // Helper para recargar cursos (usado por CRUD y modales)
  const recargarCursos = async () => {
    const [cursosData, aulasData, preceptoresData] = await Promise.all([
      listarCursos(token),
      listarAulas(token),
      listarPreceptores(token),
    ]);

    const cursosConMaterias = await Promise.all(
      (cursosData || []).map(async (curso) => {
        const materiasCurso = await listarMateriasDeCurso(token, curso.id);

        // El service ya normaliza y devuelve { id, nombreMateria, nivel, docente, cursoId }
        const dictadosMapeados = materiasCurso.map(mc => ({
          ...mc,
          nombre: mc.nombreMateria || "Sin materia",
        }));

        const aulaMapeada = aulasData.find(a => a.id === curso.aula?.id);

        const preceptorObj = preceptoresData.find(p => p.id === curso.preceptorId);

        return {
          ...curso,
          aula: aulaMapeada ? { value: aulaMapeada.id, label: aulaMapeada.nombre } : null,
          dictados: dictadosMapeados,
          aulaNombre: aulaMapeada?.nombre || "",
          materiasNombres: dictadosMapeados.map(d => d.nombre).join(", ") || "",
          preceptor: preceptorObj || null,
        };
      })
    );

    setCursos(cursosConMaterias);
  };

  // cargar datos al montar componente
  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        await recargarCursos();
        const aulasData = await listarAulas(token);
        const materiasData = await listarMaterias(token);

        setAulasOptions((aulasData || []).map(a => ({ value: a.id, label: a.nombre })));
        setMateriasOptions((materiasData || []).map(m => ({ value: m.id, label: m.nombreMateria })));
      } catch (error) {
        toast.error("Error cargando cursos: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const abrirModalCrear = async () => {
    setFormData({});
    setCursoSeleccionado(null);
    try {
      const libres = await listarAulasLibres(token);
      const opciones = (libres || []).map(a => ({ value: a.id, label: a.nombre }));
      setAulasOptions(opciones);
    } catch (e) {
      toast.error(e.message || "No se pudieron cargar las aulas libres");
      // fallback: mantiene las opciones que ya había
    } finally {
      setModalCrearShow(true);
    }
  };
  const abrirModalEditar = async (curso) => {
    setCursoSeleccionado(curso);
    // Cargar aulas libres e incluir el aula actual aunque no esté libre
    try {
      const libres = await listarAulasLibres(token);
      let opciones = (libres || []).map(a => ({ value: a.id, label: a.nombre }));

      const aulaActualId = curso.aula?.value || curso.aula?.id || null;
      const aulaActualLabel = curso.aulaNombre || curso.aula?.label || null;
      if (aulaActualId && !opciones.some(o => o.value === aulaActualId)) {
        opciones = [...opciones, { value: aulaActualId, label: aulaActualLabel || `Aula ${aulaActualId}` }];
      }
      setAulasOptions(opciones);
    } catch (e) {
      toast.error(e.message || "No se pudieron cargar las aulas libres");
      // fallback: mantiene opciones actuales
    }
    setFormData({
      id: curso.id,
      anio: curso.anio,
      division: curso.division,
      nivel: curso.nivel,
      aulaId: curso.aula?.value || "",
      materias: curso.dictados?.map(d => d.materia?.id || d.value) || []
    });
    setModalEditarShow(true);
  };
  const abrirModalVer = (curso) => { setCursoSeleccionado(curso); setModalVerShow(true); };
  const abrirModalEliminar = (curso) => { setCursoSeleccionado(curso); setModalEliminarShow(true); };

  const cerrarModalCrear = () => { setFormData({}); setModalCrearShow(false); };
  const cerrarModalEditar = () => { setCursoSeleccionado(null); setFormData({}); setModalEditarShow(false); };
  const cerrarModalVer = () => { setCursoSeleccionado(null); setModalVerShow(false); };
  const cerrarModalEliminar = () => { setCursoSeleccionado(null); setModalEliminarShow(false); };

  // abrir/cerrar modal Asignar Materias
  const abrirModalAsignarMaterias = (curso) => {
    const asignados = (curso.dictados || []).map(d => ({
      id: d.materia?.id,
      label: d.nombre || `Materia ${d.materia?.id || ""}`,
    }));
    setCursoParaAsignar({
      id: curso.id,
      anio: curso.anio,
      division: curso.division,
      asignados,
    });
    setModalAsignarMateriasShow(true);
  };
  const cerrarModalAsignarMaterias = () => {
    setCursoParaAsignar(null);
    setModalAsignarMateriasShow(false);
  };

  const abrirModalAsignarPreceptor = (curso) => {
    setCursoParaAsignarPreceptor(curso);
    setModalAsignarPreceptorShow(true);
  };

  const cerrarModalAsignarPreceptor = () => {
    setCursoParaAsignarPreceptor(null);
    setModalAsignarPreceptorShow(false);
  };

  // CRUD
  const handleCreate = async (datos) => {
    try {
      const payload = {
        anio: datos.anio, // ✅ ya viene como número
        division: datos.division,
        nivel: datos.nivel,
        aulaId: datos.aulaId || null
      };

      await crearCurso(token, payload);
      toast.success("Curso creado con éxito");
      cerrarModalCrear();
      await recargarCursos();
    } catch (error) {
      toast.error(error.message || "Error creando curso");
    }
  };

  const handleUpdate = async (datos) => {
    try {
      const payload = {
        id: datos.id,
        anio: datos.anio, // ✅ ya viene como número
        division: datos.division,
        nivel: datos.nivel,
        aulaId: datos.aulaId || null,
        dictados: datos.materias?.map(id => ({ materia: { id } })) || []
      };

      await editarCurso(token, payload);
      toast.success("Curso actualizado con éxito");
      cerrarModalEditar();
      await recargarCursos();
    } catch (error) {
      toast.error(error.message || "Error actualizando curso");
    }
  };

  const handleDelete = async () => {
    if (!cursoSeleccionado) return;
    try {
      await eliminarCurso(token, cursoSeleccionado.id);
      toast.success("Curso eliminado con éxito");
      cerrarModalEliminar();
      await recargarCursos();
    } catch (error) {
      toast.error(error.message || "Error eliminando curso");
    }
  };

  // memo para cursos ordenados
  const cursosOrdenados = useMemo(() => {
    const copia = [...cursos];
    copia.sort((a, b) => {
      if (a.anio !== b.anio) return ordenAsc ? a.anio - b.anio : b.anio - a.anio;
      // division puede ser numerica o letra; usar localeCompare como fallback
      const divA = a.division?.toString() || "";
      const divB = b.division?.toString() || "";
      return ordenAsc ? divA.localeCompare(divB, 'es', { numeric: true }) : divB.localeCompare(divA, 'es', { numeric: true });
    });
    return copia;
  }, [cursos, ordenAsc]);

  const columnasCursos = [
    { key: "anioDivision", label: "Año/División", render: c => `${c.anio} ${c.division}` },
    { key: "nivel", label: "Nivel" },
    { key: "aula", label: "Aula", render: c => c.aulaNombre || "Sin aula" },
    { 
    key: "preceptor", 
    label: "Preceptor", 
    render: c => c.preceptor 
      ? `${c.preceptor.nombre} ${c.preceptor.apellido}` 
      : "Sin preceptor" 
  }
  ];
  
  return (
    <>
      {loading ? (
        <p>Cargando cursos...</p>
      ) : (
        <TablaGenerica
          titulo="Cursos"
          columnas={columnasCursos}
          datos={cursosOrdenados}
          camposFiltrado={["anio", "division", "nivel", "aulaNombre", "materiasNombres"]}
          onView={abrirModalVer}
          onEdit={abrirModalEditar}
          onDelete={abrirModalEliminar}
          botonCrear={<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <BotonCrear texto="Crear Curso" onClick={abrirModalCrear} />
            <button type="button" className="btn btn-outline-secondary" onClick={() => setOrdenAsc(o => !o)}>
              Ordenar {ordenAsc ? '↓' : '↑'}
            </button>
          </div>}
          extraButtons={(curso) => [
            {
              icon: <FaBook />,
              onClick: () => abrirModalAsignarMaterias(curso),
              title: "Asignar Materias",
            },
            {
              icon: <FaUserTie />,
              onClick: () => abrirModalAsignarPreceptor(curso),
              title: "Asignar Preceptor",
              className: "btn-outline-success" // verde
            },
            {
              icon: <FaClock />,
              onClick: () =>
                navigate(`/cursos/${curso.id}/horarios`, { state: curso }),
              title: "Ver Horarios",
              className: "btn-outline-primary", // azul
            },
          ]}
        />
      )}

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposCurso(false, aulasOptions, materiasOptions, false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleCreate}
        titulo="Crear Curso"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarModalEditar}
        campos={camposCurso(false, aulasOptions, [], false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleUpdate}
        titulo="Editar Curso"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={{
          ...cursoSeleccionado,
          aulaNombre: cursoSeleccionado?.aulaNombre || aulasOptions.find(a => a.value === (cursoSeleccionado?.aula?.value || cursoSeleccionado?.aula?.id))?.label || "",
        }}
        campos={camposCurso(true, [], [], false)}
        titulo={`Datos del curso: ${cursoSeleccionado?.anio} ${cursoSeleccionado?.division}`}
        detallePathBase="cursos"
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={cursoSeleccionado}
        tipo="curso"
      />

      <ModalAsignacionGenerico
        show={modalAsignarMateriasShow}
        onClose={cerrarModalAsignarMaterias}
        titulo={`Asignar materias al curso ${cursoParaAsignar?.anio ?? ""} ${cursoParaAsignar?.division ?? ""}`}
        entidad={cursoParaAsignar}
        campoAsignados="asignados"
        obtenerOpciones={async (token) => {
          const data = await listarMaterias(token);
          return data.map(m => ({ value: m.id, label: m.nombreMateria }));
        }}
        onAsignar={(token, materiaIds, cursoId) =>
          asignarMateriasACurso(token, cursoId, materiaIds)
        }
        onDesasignar={(token, materiaIds, cursoId) =>
          quitarMateriasDeCurso(token, cursoId, materiaIds)
        }
        token={token}
        onActualizar={recargarCursos}
      />

      <ModalSeleccionSimple
        show={modalAsignarPreceptorShow}
        onClose={cerrarModalAsignarPreceptor}
        titulo={`Asignar preceptor al curso ${cursoParaAsignarPreceptor?.anio ?? ""} ${cursoParaAsignarPreceptor?.division ?? ""}`}
        entidad={cursoParaAsignarPreceptor}
        campoAsignado="preceptor"
        obtenerOpciones={async (token) => {
          const preceptores = await listarPreceptores(token);
          return preceptores.map(p => ({
            value: p.id,
            label: `${p.nombre} ${p.apellido}`,
          }));
        }}
        onAsignar={(token, preceptorId, cursoId) =>
          asignarPreceptorACurso(token, cursoId, preceptorId)
        }
        onDesasignar={(token, cursoId) =>
          desasignarPreceptorDeCurso(token, cursoId)
        }
        token={token}
        onActualizar={recargarCursos}
      />
    </>
  );
}
