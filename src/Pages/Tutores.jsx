import React, { useEffect, useState } from "react";
import {
  listarTutores,
  crearTutor,
  editarTutor,
  eliminarTutor,
} from "../Services/TutorService";
import { camposTutor } from "../Entidades/camposTutor";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import TablaGenerica from "../Components/TablaLista";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";

export default function ListaTutores() {
  const { user } = useAuth();
  const token = user?.token;

  const [tutores, setTutores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modales
  const [tutorSeleccionado, setTutorSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formData, setFormData] = useState({});

  const formatearFechaISO = (fecha) => {
    if (!fecha) return "";
    return fecha.split("T")[0];
  };

  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const tutoresData = await listarTutores(token);
        setTutores(tutoresData.tutores || []);
      } catch (error) {
        toast.error("Error cargando tutores: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [token]);

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Abrir modales
  const abrirModalCrear = () => {
    setTutorSeleccionado(null);
    setFormData({});
    setModalCrearShow(true);
  };

  const abrirModalEditar = (tutor) => {
    setTutorSeleccionado(tutor);
    setFormData({
      id: tutor.id,
      nombre: tutor.nombre,
      apellido: tutor.apellido,
      genero: tutor.genero,
      tipoDoc: tutor.tipoDoc || "DNI",
      dni: tutor.dni,
      email: tutor.email,
      direccion: tutor.direccion,
      telefono: tutor.telefono,
      fechaNacimiento: formatearFechaISO(tutor.fechaNacimiento),
      fechaIngreso: formatearFechaISO(tutor.fechaIngreso),
    });
    setModalEditarShow(true);
  };

  const abrirModalVer = (tutor) => {
    setTutorSeleccionado(tutor);
    setModalVerShow(true);
  };

  const abrirModalEliminar = (tutor) => {
    setTutorSeleccionado(tutor);
    setModalEliminarShow(true);
  };

  // Cerrar modales
  const cerrarModalCrear = () => {
    setFormData({});
    setModalCrearShow(false);
  };

  const cerrarModalEditar = () => {
    setTutorSeleccionado(null);
    setFormData({});
    setModalEditarShow(false);
  };

  const cerrarModalVer = () => {
    setTutorSeleccionado(null);
    setModalVerShow(false);
  };

  const cerrarModalEliminar = () => {
    setTutorSeleccionado(null);
    setModalEliminarShow(false);
  };

  // CRUD handlers
  const handleCreate = async (datos) => {
    try {
      const nuevoTutor = {
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

      const creadoResponse = await crearTutor(nuevoTutor, token);
      toast.success(creadoResponse.mensaje || "Tutor creado con éxito");
      cerrarModalCrear();
      const tutoresActualizados = await listarTutores(token);
      setTutores(tutoresActualizados.tutores || []);
    } catch (error) {
      toast.error(error.message || "Error creando tutor");
      console.error("Error al crear tutor:", error);
    }
  };

  const handleUpdate = async (datos) => {
    try {
      const tutorEditado = {
        id: datos.id,
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

      const editResponse = await editarTutor(tutorEditado, token);
      toast.success(editResponse.mensaje || "Tutor actualizado con éxito");
      cerrarModalEditar();
      const tutoresActualizados = await listarTutores(token);
      setTutores(tutoresActualizados.tutores || []);
    } catch (error) {
      toast.error(error.message || "Error al actualizar tutor");
      console.error("Error al actualizar tutor:", error);
    }
  };

  const handleDelete = async () => {
    if (!tutorSeleccionado) return;

    try {
      await eliminarTutor(tutorSeleccionado.id, token);
      toast.success("Tutor eliminado con éxito");
      cerrarModalEliminar();
      const tutoresActualizados = await listarTutores(token);
      setTutores(tutoresActualizados.tutores || []);
    } catch (error) {
      toast.error(error.message || "Error eliminando tutor");
    }
  };

  if (loading) return <p>Cargando tutores...</p>;

  const columnasTutores = [
    {
      key: "nombreApellido",
      label: "Nombre y Apellido",
      render: (t) => `${t.nombre} ${t.apellido}`,
    },
    { key: "dni", label: "DNI" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
  ];

  const tutorVistaFormateado = tutorSeleccionado
    ? {
        ...tutorSeleccionado,
        fechaNacimiento: formatearFechaISO(tutorSeleccionado.fechaNacimiento),
        fechaIngreso: formatearFechaISO(tutorSeleccionado.fechaIngreso),
      }
    : null;

  return (
    <>
      <TablaGenerica
        titulo="Lista de Tutores"
        columnas={columnasTutores}
        datos={tutores}
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
        onDelete={abrirModalEliminar}
        camposFiltrado={["nombreApellido", "email"]}
        botonCrear={<BotonCrear texto="Crear tutor" onClick={abrirModalCrear} />}
        placeholderBuscador="Buscar por nombre o email"
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposTutor(false)}  // modo edición
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleCreate}
        titulo="Crear Tutor"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarModalEditar}
        campos={camposTutor(false)}  // modo edición
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleUpdate}
        titulo="Editar Tutor"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={tutorVistaFormateado}
        campos={camposTutor(true)}  // modo vista
        titulo={`Datos del tutor: ${tutorSeleccionado?.nombre} ${tutorSeleccionado?.apellido}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={tutorSeleccionado}
        tipo="tutor"
      />
    </>
  );
}
