import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useCicloLectivo } from "../Context/CicloLectivoContext";
import { listarAlumnosConFiltros, eliminarAlumno, listarAlumnosEgresados, listarAlumnosExcluidos, reactivarAlumno } from "../Services/AlumnoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import { toast } from "react-toastify";

// 🆕 imports para asignar tutor
import ModalAsignarTutores from "../Components/Modals/ModalAsignarTutores";
import { FaUserFriends } from "react-icons/fa";

export default function ListaAlumnos() {
  const { user } = useAuth();
  const { cicloLectivo } = useCicloLectivo();
  const location = useLocation();

  const filtrosIniciales = location.state?.filtros || {};
  const [filtros] = useState(filtrosIniciales);

  // modo de visualización: 'filtros' | 'egresados' | 'excluidos'
  const [modo, setModo] = useState('filtros');

  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  // 🆕 estados para asignar tutor
  const [modalAsignarTutorShow, setModalAsignarTutorShow] = useState(false);
  const [alumnoParaAsignar, setAlumnoParaAsignar] = useState(null);

  const abrirModalAsignarTutor = (alumno) => {
    setAlumnoParaAsignar(alumno);
    setModalAsignarTutorShow(true);
  };
  const cerrarModalAsignarTutor = () => {
    setAlumnoParaAsignar(null);
    setModalAsignarTutorShow(false);
  };

  // cargar alumnos
  const cargarAlumnos = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      if (modo === 'filtros') {
        // Si es preceptor, cargar solo alumnos de sus cursos a cargo
        if (user?.rol === "ROLE_PRECEPTOR" && user?.preceptorId) {
          // Validar que hay ciclo lectivo
          if (!cicloLectivo?.id) {
            toast.warn("Seleccioná un ciclo lectivo en Configuración");
            data = [];
          } else {
            try {
              const { listarCursosPorPreceptor } = await import("../Services/CursoService");
              const cursosPreceptor = await listarCursosPorPreceptor(user?.token, user.preceptorId);
              const cursoIds = (cursosPreceptor || []).map(c => c.id);
              
              // Cargar alumnos para cada curso del preceptor
              const alumnosPromesas = cursoIds.map(cursoId =>
                listarAlumnosPorCurso(user?.token, cursoId, cicloLectivo.id)
              );
              const resultados = await Promise.all(alumnosPromesas);
              
              // Combinar resultados y eliminar duplicados por ID
              const alumnosMap = new Map();
              resultados.flat().forEach(a => {
                if (!alumnosMap.has(a.id)) alumnosMap.set(a.id, a);
              });
              data = Array.from(alumnosMap.values());
            } catch (e) {
              console.error("Error cargando alumnos del preceptor:", e);
              data = [];
            }
          }
        } else {
          data = await listarAlumnosConFiltros(user?.token, filtros);
        }
      } else if (modo === 'egresados') {
        data = await listarAlumnosEgresados(user?.token);
      } else if (modo === 'excluidos') {
        data = await listarAlumnosExcluidos(user?.token);
      }
      setAlumnos(data || []);
    } catch (error) {
      toast.error("Error cargando alumnos: " + error.message);
      setAlumnos([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token, filtros, modo, user?.rol, user?.preceptorId, cicloLectivo?.id]);

  useEffect(() => {
    if (user?.token) cargarAlumnos();
  }, [user?.token, filtros, modo, cargarAlumnos]);



  const abrirModalVer = (alumno) => { setAlumnoSeleccionado(alumno); setModalVerShow(true); };
  const cerrarModalVer = () => { setAlumnoSeleccionado(null); setModalVerShow(false); };

  const abrirModalEliminar = (alumno) => { setAlumnoSeleccionado(alumno); setModalEliminarShow(true); };
  const cerrarModalEliminar = () => { setAlumnoSeleccionado(null); setModalEliminarShow(false); };

  // eliminar alumno
  const handleDelete = async () => {
    if (!alumnoSeleccionado) return;
    try {
      await eliminarAlumno(user.token, alumnoSeleccionado.id);
      toast.success("Alumno eliminado con éxito");
      cerrarModalEliminar();
      cargarAlumnos();
    } catch (error) {
      toast.error(error.message || "Error eliminando alumno");
    }
  };

  if (loading) return <p>Cargando alumnos...</p>;

  const columnasAlumnos = [
    { key: "nombreApellido", label: "Nombre y Apellido", render: a => `${a.nombre} ${a.apellido}` },
    { key: "dni", label: "DNI" },
    { key: "curso", label: "Curso", render: a => a?.cursoActual ? `${a.cursoActual.anio ?? ''}°${a.cursoActual.division ?? ''}` : '-' },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
  ];

  // Campos a mostrar en el modal de VER (vista resumida) para Alumnos
  const camposAlumnoVistaModal = [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'apellido', label: 'Apellido', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'telefono', label: 'Teléfono', type: 'text' },
    {
      name: 'tutores',
      label: 'Tutores',
      render: (lista) => Array.isArray(lista) && lista.length ? lista.map(t => `${t.apellido} ${t.nombre}`).join(', ') : '-',
    },
    {
      name: 'cursoActual',
      label: 'Curso Actual',
      render: (c) => c ? (c.nombre || `${c.anio ?? ''} ${c.division ?? ''}`.trim()) : '-',
    },
  ];

  const accionesExtraFila = (alumno) => {
    const acciones = [];
    
    // Solo admin/director/preceptor pueden asignar tutores (pero preceptor solo ve)
    if (user?.rol !== "ROLE_PRECEPTOR") {
      acciones.push({
        icon: <FaUserFriends />,
        onClick: () => abrirModalAsignarTutor(alumno),
        title: "Asignar Tutor",
      });
    }
    
    if (modo === 'excluidos' && user?.rol !== "ROLE_PRECEPTOR") {
      acciones.push({
        label: 'Reactivar',
        className: 'btn btn-sm btn-warning',
        onClick: async () => {
          try {
            await reactivarAlumno(user?.token, alumno.id);
            toast.success('Alumno reactivado');
            cargarAlumnos();
          } catch (e) {
            toast.error(e.message || 'Error reactivando alumno');
          }
        }
      });
    }
    return acciones;
  };

  return (
    <>
      <TablaGenerica
        titulo="Alumnos"
        columnas={columnasAlumnos}
        datos={alumnos}
        onView={abrirModalVer}
        onDelete={user?.rol === "ROLE_PRECEPTOR" ? undefined : abrirModalEliminar}
        camposFiltrado={["nombre", "apellido", "dni"]}
        placeholderBuscador="Buscar por nombre o DNI"
        // botones extra dinámicos
        extraButtons={accionesExtraFila}
        // insertar selector de modo a la izquierda del control Mostrar
        leftControls={() => 
          user?.rol === "ROLE_PRECEPTOR" ? null : (
            <div className="btn-group btn-group-sm" role="group" aria-label="Modo listado alumnos">
              <button className={`btn ${modo==='filtros' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('filtros')}>Activos / Filtros</button>
              <button className={`btn ${modo==='egresados' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('egresados')}>Egresados</button>
              <button className={`btn ${modo==='excluidos' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('excluidos')}>Excluidos</button>
            </div>
          )
        }
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={alumnoSeleccionado}
        campos={camposAlumnoVistaModal}
        titulo={`Datos del alumno: ${alumnoSeleccionado?.nombre} ${alumnoSeleccionado?.apellido}`}
        detallePathBase="alumnos"
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={alumnoSeleccionado}
        tipo="alumno"
      />

      {/* Modal para gestionar múltiples tutores */}
      <ModalAsignarTutores
        show={modalAsignarTutorShow}
        onClose={cerrarModalAsignarTutor}
        alumno={alumnoParaAsignar}
        token={user?.token}
        onAlumnoActualizado={() => cargarAlumnos()}
      />
    </>
  );
}
