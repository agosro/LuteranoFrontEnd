import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { listarAlumnosConFiltros, editarAlumno, eliminarAlumno } from "../Services/AlumnoService";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import { camposAlumno } from "../Entidades/camposAlumno";
import { toast } from "react-toastify";

export default function ListaAlumnos() {
  const { user } = useAuth();
  const location = useLocation();

  // Guardamos filtros en state para que React detecte cambios
  const filtrosIniciales = location.state?.filtros || {};
  const [filtros] = useState(filtrosIniciales);

  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);
  const [formDataEditar, setFormDataEditar] = useState({});

  // Cargar alumnos según filtros
  const cargarAlumnos = async () => {
    setLoading(true);
    try {
      const data = await listarAlumnosConFiltros(user.token, filtros);
      setAlumnos(data || []);
    } catch (error) {
      toast.error("Error cargando alumnos: " + error.message);
      setAlumnos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) cargarAlumnos();
  }, [user, filtros]); // ✅ filtros está en el state

  // Modales
  const abrirModalEditar = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setFormDataEditar({
      id: alumno.id,
      nombre: alumno.nombre || "",
      apellido: alumno.apellido || "",
      genero: alumno.genero || "",
      tipoDoc: alumno.tipoDoc || "",
      dni: alumno.dni || "",
      email: alumno.email || "",
      direccion: alumno.direccion || "",
      telefono: alumno.telefono || "",
      fechaNacimiento: alumno.fechaNacimiento?.split("T")[0] || "",
      fechaIngreso: alumno.fechaIngreso?.split("T")[0] || "",
    });
    setModalEditarShow(true);
  };
  const cerrarModalEditar = () => { setFormDataEditar({}); setAlumnoSeleccionado(null); setModalEditarShow(false); };

  const abrirModalVer = (alumno) => { setAlumnoSeleccionado(alumno); setModalVerShow(true); };
  const cerrarModalVer = () => { setAlumnoSeleccionado(null); setModalVerShow(false); };

  const abrirModalEliminar = (alumno) => { setAlumnoSeleccionado(alumno); setModalEliminarShow(true); };
  const cerrarModalEliminar = () => { setAlumnoSeleccionado(null); setModalEliminarShow(false); };

  // Actualizar alumno
  const handleUpdate = async (datos) => {
    try {
      const editado = {
        id: datos.id,
        nombre: datos.nombre,
        apellido: datos.apellido,
        genero: datos.genero,
        tipoDoc: datos.tipoDoc,
        dni: datos.dni,
        email: datos.email,
        direccion: datos.direccion,
        telefono: datos.telefono,
        fechaNacimiento: datos.fechaNacimiento ? new Date(datos.fechaNacimiento).toISOString() : undefined,
        fechaIngreso: datos.fechaIngreso ? new Date(datos.fechaIngreso).toISOString() : undefined,
        ...(datos.tutor?.id && { tutor: { id: datos.tutor.id } }),
        ...(datos.cursoActual?.id && { cursoActual: { id: datos.cursoActual.id } }),
      };

      await editarAlumno(user.token, editado);
      toast.success("Alumno actualizado con éxito");
      cerrarModalEditar();
      cargarAlumnos();
    } catch (error) {
      toast.error(error.message || "Error actualizando alumno");
    }
  };

  // Eliminar alumno
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
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Alumnos"
        columnas={columnasAlumnos}
        datos={alumnos}
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
        onDelete={abrirModalEliminar}
        camposFiltrado={["nombre", "apellido", "dni"]}
        placeholderBuscador="Buscar por nombre o DNI"
      />

      {alumnoSeleccionado && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={cerrarModalEditar}
          formData={formDataEditar}
          campos={camposAlumno(false)}
          onInputChange={(name, value) => setFormDataEditar(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleUpdate}
          titulo="Editar Alumno"
        />
      )}

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={alumnoSeleccionado}
        campos={camposAlumno(true)}
        titulo={`Datos del alumno: ${alumnoSeleccionado?.nombre} ${alumnoSeleccionado?.apellido}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={alumnoSeleccionado}
        tipo="alumno"
      />
    </>
  );
}