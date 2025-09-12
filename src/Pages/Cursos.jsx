import React, { useEffect, useState } from "react";
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
import { listarAulas } from "../Services/AulaService";
import { listarMaterias } from "../Services/MateriaService";

// 🆕 imports para asignar materias
import ModalAsignacionGenerico from "../Components/Modals/ModalAsignar";
import { asignarMateriasACurso, quitarMateriasDeCurso, listarMateriasDeCurso  } from "../Services/MateriaCursoService";
import { FaBook } from "react-icons/fa";

export default function ListaCursos() {
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
  const [cursoParaAsignar, setCursoParaAsignar] = useState(null); // {id, anio, division, asignados: [{id,label}]}

  // Función para mapear cursos (solo mapear dictados, aula ya viene del backend)
  const mapCursos = (cursosData, materiasData) => {
    const materiasMap = (materiasData || []).map(m => ({ value: m.id, label: m.nombreMateria }));

    return (cursosData || []).map(curso => ({
      ...curso,
      dictados: (curso.dictados || []).map(d => {
        const materia = materiasMap.find(m => m.value === d.materia?.id);
        return { ...d, nombre: materia?.label || "Sin materia" };
      })
    }));
  };

  // 🆕 helper para recargar cursos (lo usamos después de asignar)
  const recargarCursos = async () => {
    const [cursosData, materiasData] = await Promise.all([listarCursos(token), listarMaterias(token)]);
    setCursos(mapCursos(cursosData, materiasData));
  };

  // Cargar datos al montar componente
  useEffect(() => {
  if (!token) return;

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Pedimos cursos, aulas y todas las materias
      const [cursosData, aulasData, materiasData] = await Promise.all([
        listarCursos(token),
        listarAulas(token),
        listarMaterias(token), // 👈 llena materiasOptions
      ]);

      // Guardamos aulas y materias como opciones para los formularios
      setAulasOptions((aulasData || []).map(a => ({ value: a.id, label: a.nombre })));
      setMateriasOptions((materiasData || []).map(m => ({ value: m.id, label: m.nombreMateria })));

      // Ahora completamos los cursos con las materias reales asignadas
      const cursosConMaterias = await Promise.all(
        (cursosData || []).map(async (curso) => {
          const materiasCurso = await listarMateriasDeCurso(token, curso.id);

          // Mapear materias de este curso
          const dictadosMapeados = materiasCurso.map(mc => ({
            ...mc,
            nombre: mc.materia?.nombreMateria || "Sin materia",
          }));

          const aulaMapeada = aulasData.find(a => a.id === curso.aula?.id);

          return {
            ...curso,
            aula: aulaMapeada ? { value: aulaMapeada.id, label: aulaMapeada.nombre } : null,
            dictados: dictadosMapeados,
            aulaNombre: aulaMapeada?.nombre || "",
            materiasNombres: dictadosMapeados.map(d => d.nombre).join(", ") || "",
          };
        })
      );

      console.log("Lista de cursos cargada:", cursosConMaterias);
      setCursos(cursosConMaterias);
    } catch (error) {
      toast.error("Error cargando cursos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  cargarDatos();
}, [token]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const abrirModalCrear = () => { setFormData({}); setCursoSeleccionado(null); setModalCrearShow(true); };
  const abrirModalEditar = (curso) => {
    setCursoSeleccionado(curso);
    setFormData({
      id: curso.id,
      anio: curso.anio,
      division: curso.division,
      nivel: curso.nivel,
      aulaId: curso.aula?.id || "",
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

  // 🆕 abrir/cerrar modal Asignar Materias (sin tocar los otros)
  const abrirModalAsignarMaterias = (curso) => {
    // adaptamos la entidad al formato que espera el modal: items con {id, label}
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

  // CRUD
  const handleCreate = async (datos) => {
    try {
      const payload = {
        anio: Number(datos.anio),
        division: datos.division,
        nivel: datos.nivel,
        aulaId: datos.aulaId || null
      };

      await crearCurso(token, payload);
      toast.success("Curso creado con éxito");
      cerrarModalCrear();

      const [cursosData, materiasData] = await Promise.all([listarCursos(token), listarMaterias(token)]);
      setCursos(mapCursos(cursosData, materiasData));
    } catch (error) {
      toast.error(error.message || "Error creando curso");
    }
  };

  const handleUpdate = async (datos) => {
    try {
      const payload = {
        id: datos.id,
        anio: Number(datos.anio),
        division: datos.division,
        nivel: datos.nivel,
        aulaId: datos.aulaId || null,
        dictados: datos.materias?.map(id => ({ materia: { id } })) || []
      };

      await editarCurso(token, payload);
      toast.success("Curso actualizado con éxito");
      cerrarModalEditar();

      const [cursosData, materiasData] = await Promise.all([listarCursos(token), listarMaterias(token)]);
      setCursos(mapCursos(cursosData, materiasData));
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

      const [cursosData, materiasData] = await Promise.all([listarCursos(token), listarMaterias(token)]);
      setCursos(mapCursos(cursosData, materiasData));
    } catch (error) {
      toast.error(error.message || "Error eliminando curso");
    }
  };

  if (loading) return <p>Cargando cursos...</p>;

  const columnasCursos = [
    { key: "anioDivision", label: "Año/División", render: c => `${c.anio} ${c.division}` },
    { key: "nivel", label: "Nivel" },
    { key: "aula", label: "Aula", render: c => c.aula?.nombre || "Sin aula" },
    { key: "materias", label: "Materias", render: c => c.dictados?.map(d => d.nombre).join(", ") || "Sin materias asignadas" }
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Cursos"
        columnas={columnasCursos}
        datos={cursos}
        camposFiltrado={["anio", "division", "nivel", "aulaNombre", "materiasNombres"]} // prop auxiliar
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
        onDelete={abrirModalEliminar}
        botonCrear={<BotonCrear texto="Crear Curso" onClick={abrirModalCrear} />}

        // 🆕 botón adicional en acciones (usa tu API extraButtons)
        extraButtons={(curso) => [
          {
            icon: <FaBook />,
            onClick: () => abrirModalAsignarMaterias(curso),
            title: "Asignar Materias",
          }
        ]}
      />

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
        campos={camposCurso(false, aulasOptions, materiasOptions, true)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleUpdate}
        titulo="Editar Curso"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={cursoSeleccionado}
        campos={camposCurso(true, aulasOptions, materiasOptions, true)}
        titulo={`Datos del curso: ${cursoSeleccionado?.anio} ${cursoSeleccionado?.division}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={cursoSeleccionado}
        tipo="curso"
      />

      {/* 🆕 Modal de asignar materias (no toca los otros modales) */}
      <ModalAsignacionGenerico
        show={modalAsignarMateriasShow}
        onClose={cerrarModalAsignarMaterias}
        titulo={`Asignar materias al curso ${cursoParaAsignar?.anio ?? ""} ${cursoParaAsignar?.division ?? ""}`}
        entidad={cursoParaAsignar}
        campoAsignados="asignados" // usamos el array "asignados" que armamos arriba ({id,label})
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
    </>
  );
}
