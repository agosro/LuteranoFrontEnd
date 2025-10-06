// src/Pages/ListaPreceptores.jsx
import React, { useEffect, useState } from "react";
import {
  listarPreceptores,
  crearPreceptor,
  eliminarPreceptor,
} from "../Services/PreceptorService";
import { obtenerUsuariosSinAsignarPorRol } from "../Services/UsuarioService";
import { camposPreceptor } from "../Entidades/camposPreceptor";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import TablaGenerica from "../Components/TablaLista";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function ListaPreceptores() {
  const { user } = useAuth();
  const token = user?.token;

  const [preceptores, setPreceptores] = useState([]);
  const [usuariosOptions, setUsuariosOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de modales
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formData, setFormData] = useState({});


  // Cargar datos iniciales
  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const preceptoresData = await listarPreceptores(token); // ya devuelve array
        const usuariosData = await obtenerUsuariosSinAsignarPorRol(token, "ROLE_PRECEPTOR");

        setPreceptores(preceptoresData);

        const opcionesUsuarios = (usuariosData.usuarios || []).map((u) => ({
          value: u.id,
          label: `${u.name} ${u.lastName} (${u.email})`,
          nombre: u.name,
          apellido: u.lastName,
          email: u.email,
        }));
        setUsuariosOptions(opcionesUsuarios);
      } catch (error) {
        toast.error("Error cargando datos: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [token]);

  // Handlers de inputs
  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUsuarioChange = (usuarioId) => {
    if (!usuarioId) {
      setFormData((prev) => ({
        ...prev,
        usuarioId: "",
        nombre: "",
        apellido: "",
        email: "",
      }));
      return;
    }
    const usuario = usuariosOptions.find((u) => u.value === usuarioId);
    if (usuario) {
      setFormData((prev) => ({
        ...prev,
        usuarioId: usuarioId,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      }));
    }
  };

  // Abrir modales
  const abrirModalCrear = () => {
    setPreceptorSeleccionado(null);
    setFormData({});
    setModalCrearShow(true);
  };


  const abrirModalVer = (preceptor) => {
    setPreceptorSeleccionado(preceptor);
    setModalVerShow(true);
  };

  const abrirModalEliminar = (preceptor) => {
    setPreceptorSeleccionado(preceptor);
    setModalEliminarShow(true);
  };

  // Cerrar modales
  const cerrarModalCrear = () => {
    setFormData({});
    setModalCrearShow(false);
  };

  const cerrarModalVer = () => {
    setPreceptorSeleccionado(null);
    setModalVerShow(false);
  };

  const cerrarModalEliminar = () => {
    setPreceptorSeleccionado(null);
    setModalEliminarShow(false);
  };

  // CRUD Handlers
  const handleCreate = async (datos) => {
    try {
      const nuevoPreceptor = {
        user: { id: datos.usuarioId },
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
        cursos: [],
      };

      const creadoResponse = await crearPreceptor(nuevoPreceptor, token);
      toast.success(creadoResponse.mensaje || "Preceptor creado con éxito");
      cerrarModalCrear();
      const preceptoresActualizados = await listarPreceptores(token);
      setPreceptores(preceptoresActualizados);
    } catch (error) {
      toast.error(error.message || "Error creando preceptor");
      console.error("Error al crear preceptor:", error);
    }
  };

  
  const handleDelete = async () => {
    if (!preceptorSeleccionado) return;

    try {
      await eliminarPreceptor(preceptorSeleccionado.id, token);
      toast.success("Preceptor eliminado con éxito");
      cerrarModalEliminar();
      const preceptoresActualizados = await listarPreceptores(token);
      setPreceptores(preceptoresActualizados);
    } catch (error) {
      toast.error(error.message || "Error eliminando preceptor");
    }
  };

  if (loading) return <p>Cargando preceptores...</p>;

  const columnasPreceptores = [
    {
      key: "nombreApellido",
      label: "Nombre y Apellido",
      render: (p) => `${p.nombre} ${p.apellido}`,
    },
    { key: "dni", label: "DNI" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    {
      key: "cursos",
      label: "Cursos asignados",
      render: (p) =>
        p.cursos && p.cursos.length > 0
          ? p.cursos.map((c) => c.nombre || c.nombreCurso).join(", ")
          : "Sin cursos asignados",
    },
  ];

  // Campos a mostrar en el modal de VER (vista resumida)
  const camposPreceptorVistaModal = [
    { name: "nombre", label: "Nombre", type: "text" },
    { name: "apellido", label: "Apellido", type: "text" },
    { name: "email", label: "Correo Electrónico", type: "email" },
    { name: "telefono", label: "Teléfono", type: "text" },
  ];

  const preceptorVistaFormateado = preceptorSeleccionado || null;

  return (
    <>
      <TablaGenerica
        titulo="Preceptores"
        columnas={columnasPreceptores}
        datos={preceptores}
        onView={abrirModalVer}
        onDelete={abrirModalEliminar}
        camposFiltrado={["nombreApellido", "email"]}
        botonCrear={<BotonCrear texto="Crear preceptor" onClick={abrirModalCrear} />}
        placeholderBuscador="Buscar por nombre o email"
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposPreceptor(usuariosOptions, false, false, !!formData.usuarioId)}
        formData={formData}
        onInputChange={handleInputChange}
        onUsuarioChange={handleUsuarioChange}
        onSubmit={handleCreate}
        titulo="Crear Preceptor"
      />


      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={preceptorVistaFormateado}
        campos={camposPreceptorVistaModal}
        titulo={`Datos del preceptor: ${preceptorSeleccionado?.nombre} ${preceptorSeleccionado?.apellido}`}
        detallePathBase="preceptores"
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={preceptorSeleccionado}
        tipo="preceptor"
      />
    </>
  );
}
