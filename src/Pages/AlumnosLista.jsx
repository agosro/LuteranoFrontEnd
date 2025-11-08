import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { listarAlumnosConFiltros, eliminarAlumno, listarAlumnosEgresados, listarAlumnosExcluidos, reactivarAlumno } from "../Services/AlumnoService";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import { toast } from "react-toastify";

// 🆕 imports para asignar tutor
import ModalSeleccionSimple from "../Components/Modals/ModalSeleccionSimple";
import { listarTutores } from "../Services/TutorService";
import { asignarTutorAAlumno, desasignarTutorDeAlumno } from "../Services/TutorAlumnoService";
import { FaUserFriends } from "react-icons/fa";

export default function ListaAlumnos() {
  const { user } = useAuth();
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
        data = await listarAlumnosConFiltros(user?.token, filtros);
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
  }, [user?.token, filtros, modo]);

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
      name: 'tutor',
      label: 'Tutor',
      render: (t) => t ? `${t.nombre} ${t.apellido}` : '-',
    },
    {
      name: 'cursoActual',
      label: 'Curso Actual',
      render: (c) => c ? (c.nombre || `${c.anio ?? ''} ${c.division ?? ''}`.trim()) : '-',
    },
  ];

  const accionesExtraFila = (alumno) => {
    const acciones = [
      {
        icon: <FaUserFriends />,
        onClick: () => abrirModalAsignarTutor(alumno),
        title: "Asignar Tutor",
      }
    ];
    if (modo === 'excluidos') {
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
        onDelete={abrirModalEliminar}
        camposFiltrado={["nombre", "apellido", "dni"]}
        placeholderBuscador="Buscar por nombre o DNI"
        // botones extra dinámicos
        extraButtons={accionesExtraFila}
        // insertar selector de modo a la izquierda del control Mostrar
        leftControls={() => (
          <div className="btn-group btn-group-sm" role="group" aria-label="Modo listado alumnos">
            <button className={`btn ${modo==='filtros' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('filtros')}>Activos / Filtros</button>
            <button className={`btn ${modo==='egresados' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('egresados')}>Egresados</button>
            <button className={`btn ${modo==='excluidos' ? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setModo('excluidos')}>Excluidos</button>
          </div>
        )}
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

      {/* 🆕 Modal Asignar Tutor */}
      <ModalSeleccionSimple
        show={modalAsignarTutorShow}
        onClose={cerrarModalAsignarTutor}
        titulo={`Asignar tutor a ${alumnoParaAsignar?.nombre} ${alumnoParaAsignar?.apellido}`}
        entidad={alumnoParaAsignar}
        campoAsignado="tutor"
        obtenerOpciones={async (token) => {
          const lista = await listarTutores(token);
          return lista.map(t => ({ value: t.id, label: `${t.nombre} ${t.apellido}` }));
        }}
        onAsignar={(token, tutorId, alumnoId) =>
          asignarTutorAAlumno(token, tutorId, alumnoId)
        }
        onDesasignar={(token, alumnoId) =>
          desasignarTutorDeAlumno(token, alumnoParaAsignar?.tutor?.id, alumnoId)
        }
        token={user.token}
        onActualizar={cargarAlumnos}
      />
    </>
  );
}
