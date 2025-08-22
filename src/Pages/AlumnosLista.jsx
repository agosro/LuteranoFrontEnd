import React, { useEffect, useState } from "react";
import { listarAlumnos, crearAlumno, editarAlumno, eliminarAlumno } from "../Services/AlumnoService";
import TablaGenerica from "../Components/TablaLista";
import BotonCrear from "../Components/Botones/BotonCrear";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { camposAlumno } from "../Entidades/camposAlumno";

export default function ListaAlumnos() {
  const { user } = useAuth();

  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formDataCrear, setFormDataCrear] = useState({});
  const [formDataEditar, setFormDataEditar] = useState({});

  // Cargar alumnos
  const cargarAlumnos = async () => {
    setLoading(true);
    try {
      const data = await listarAlumnos(user.token);
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
  }, [user]);

  // Manejo de inputs
  const handleInputChangeCrear = (name, value) =>
    setFormDataCrear(prev => ({ ...prev, [name]: value }));
  const handleInputChangeEditar = (name, value) =>
    setFormDataEditar(prev => ({ ...prev, [name]: value }));

  // Abrir/ cerrar modales
  const abrirModalCrear = () => { setFormDataCrear({}); setModalCrearShow(true); };
  const cerrarModalCrear = () => { setFormDataCrear({}); setModalCrearShow(false); };

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
      fechaNacimiento: alumno.fechaNacimiento ? alumno.fechaNacimiento.split("T")[0] : "",
      fechaIngreso: alumno.fechaIngreso ? alumno.fechaIngreso.split("T")[0] : "",
    });
    setModalEditarShow(true);
  };
  const cerrarModalEditar = () => { setFormDataEditar({}); setAlumnoSeleccionado(null); setModalEditarShow(false); };

  const abrirModalVer = (alumno) => { setAlumnoSeleccionado(alumno); setModalVerShow(true); };
  const cerrarModalVer = () => { setAlumnoSeleccionado(null); setModalVerShow(false); };

  const abrirModalEliminar = (alumno) => { setAlumnoSeleccionado(alumno); setModalEliminarShow(true); };
  const cerrarModalEliminar = () => { setAlumnoSeleccionado(null); setModalEliminarShow(false); };

  // CRUD
  const handleCreate = async (datos) => {
  try {
    const nuevoAlumno = {
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
      ...(datos.tutor && datos.tutor.id && { tutor: { id: datos.tutor.id } }),
      ...(datos.cursoActual && datos.cursoActual.id && { cursoActual: { id: datos.cursoActual.id } }),
    };

    await crearAlumno(user.token, nuevoAlumno);
    toast.success("Alumno creado con éxito");
    cerrarModalCrear();
    cargarAlumnos();
  } catch (error) {
    toast.error(error.message || "Error creando alumno");
  }
};

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
      ...(datos.tutor && datos.tutor.id && { tutor: { id: datos.tutor.id } }),
      ...(datos.cursoActual && datos.cursoActual.id && { cursoActual: { id: datos.cursoActual.id } }),
    };

    await editarAlumno(user.token, editado);
    toast.success("Alumno actualizado con éxito");
    cerrarModalEditar();
    cargarAlumnos();
  } catch (error) {
    toast.error(error.message || "Error actualizando alumno");
  }
};

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
        botonCrear={<BotonCrear texto="Crear alumno" onClick={abrirModalCrear} />}
        placeholderBuscador="Buscar por nombre o DNI"
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposAlumno(false)}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        onSubmit={handleCreate}
        titulo="Crear Alumno"
      />

      {alumnoSeleccionado && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={cerrarModalEditar}
          formData={formDataEditar}
          campos={camposAlumno(false)}
          onInputChange={handleInputChangeEditar}
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