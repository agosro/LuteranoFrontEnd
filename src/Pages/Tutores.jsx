// src/Pages/ListaTutores.jsx
import React, { useEffect, useState } from "react";
import {
  listarTutores,
  crearTutor,
  eliminarTutor,
} from "../Services/TutorService";
import { listarAlumnosACargo } from "../Services/TutorAlumnoService";
import { camposTutor } from "../Entidades/camposTutor";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import TablaGenerica from "../Components/TablaLista";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function ListaTutores() {
  const { user } = useAuth();
  const token = user?.token;

  const [tutores, setTutores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modales
  const [tutorSeleccionado, setTutorSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  // const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);
  const [alumnosCargoModal, setAlumnosCargoModal] = useState([]);
  const [alumnosCargoLoading, setAlumnosCargoLoading] = useState(false);

  const [formData, setFormData] = useState({});


  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const tutoresData = await listarTutores(token); // ya devuelve array
        setTutores(tutoresData);
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



  const abrirModalVer = async (tutor) => {
    setTutorSeleccionado(tutor);
    setAlumnosCargoLoading(true);
    try {
      const alumnos = await listarAlumnosACargo(token, tutor.id);
      setAlumnosCargoModal(Array.isArray(alumnos) ? alumnos : []);
    } catch (error) {
      console.warn("No se pudo cargar alumnos a cargo", error);
      setAlumnosCargoModal([]);
    } finally {
      setAlumnosCargoLoading(false);
    }
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
        fechaNacimiento: inputLocalToBackendISO(datos.fechaNacimiento),
        fechaIngreso: inputLocalToBackendISO(datos.fechaIngreso),
      };

      const creadoResponse = await crearTutor(nuevoTutor, token);
      toast.success(creadoResponse.mensaje || "Tutor creado con éxito");
      cerrarModalCrear();
      const tutoresActualizados = await listarTutores(token);
      setTutores(tutoresActualizados);
    } catch (error) {
      toast.error(error.message || "Error creando tutor");
      if (error.data && error.data.errors) {
        Object.entries(error.data.errors).forEach(([campo, mensaje]) => {
          toast.error(`${campo}: ${mensaje}`);
        });
      }
      console.error("Error al crear tutor:", error);
    }
  };



  const handleDelete = async () => {
    if (!tutorSeleccionado) return;

    try {
      await eliminarTutor(tutorSeleccionado.id, token);
      toast.success("Tutor eliminado con éxito");
      cerrarModalEliminar();
      const tutoresActualizados = await listarTutores(token);
      setTutores(tutoresActualizados);
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

  const tutorVistaFormateado = tutorSeleccionado ? {
    id: tutorSeleccionado.id,
    nombre: tutorSeleccionado.nombre || "",
    apellido: tutorSeleccionado.apellido || "",
    dni: tutorSeleccionado.dni || "",
    email: tutorSeleccionado.email || "",
    telefono: tutorSeleccionado.telefono || "",
    alumnos: alumnosCargoModal.map(a => ({
      nombre: a.nombre,
      apellido: a.apellido,
      dni: a.dni
    })),
  } : null;

  return (
    <>
      <TablaGenerica
        titulo="Tutores"
        columnas={columnasTutores}
        datos={tutores}
        onView={abrirModalVer}
        // onEdit eliminado
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



      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={tutorVistaFormateado}
        campos={[
          { name: 'nombre', label: 'Nombre' },
          { name: 'apellido', label: 'Apellido' },
          { name: 'dni', label: 'DNI' },
          { name: 'email', label: 'Email' },
          { name: 'telefono', label: 'Teléfono' },
          {
            name: 'alumnos',
            label: 'Alumnos a cargo',
            render: (alumnos) => alumnosCargoLoading ? (
              <span className="text-muted">Cargando...</span>
            ) : Array.isArray(alumnos) && alumnos.length ? (
              alumnos.map((a, i) => (
                <span key={a.dni || i}>
                  {a.apellido}, {a.nombre} ({a.dni}){i < alumnos.length - 1 ? ', ' : ''}
                </span>
              ))
            ) : (
              <span className="text-muted">-</span>
            )
          },
        ]}
        titulo={`Datos del tutor: ${tutorSeleccionado?.nombre} ${tutorSeleccionado?.apellido}`}
        detallePathBase="tutores"
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
