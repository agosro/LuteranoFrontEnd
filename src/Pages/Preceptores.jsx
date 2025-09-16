// src/Pages/ListaPreceptores.jsx
import React, { useEffect, useState } from "react";
import {
  listarPreceptores,
  crearPreceptor,
  editarPreceptor,
  eliminarPreceptor,
} from "../Services/PreceptorService";
import { obtenerUsuariosSinAsignarPorRol } from "../Services/UsuarioService";
import { camposPreceptor } from "../Entidades/camposPreceptor";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import TablaGenerica from "../Components/TablaLista";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";

export default function ListaPreceptores() {
  const { user } = useAuth();
  const token = user?.token;

  const [preceptores, setPreceptores] = useState([]);
  const [usuariosOptions, setUsuariosOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de modales
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);

  const [formData, setFormData] = useState({});

  const formatearFechaISO = (fecha) => {
    if (!fecha) return "";
    return fecha.split("T")[0];
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const preceptoresData = await listarPreceptores(token);
        const usuariosData = await obtenerUsuariosSinAsignarPorRol(token, "ROLE_PRECEPTOR");

        setPreceptores(preceptoresData.preceptores || []);

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

  const abrirModalEditar = (preceptor) => {
    setPreceptorSeleccionado(preceptor);
    setFormData({
      id: preceptor.id,
      usuarioId: preceptor.user?.id || "",
      nombre: preceptor.nombre,
      apellido: preceptor.apellido,
      genero: preceptor.genero,
      tipoDoc: preceptor.tipoDoc || "DNI",
      dni: preceptor.dni,
      email: preceptor.email,
      direccion: preceptor.direccion,
      telefono: preceptor.telefono,
      fechaNacimiento: formatearFechaISO(preceptor.fechaNacimiento),
      fechaIngreso: formatearFechaISO(preceptor.fechaIngreso),
    });
    setModalEditarShow(true);
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

  const cerrarModalEditar = () => {
    setPreceptorSeleccionado(null);
    setFormData({});
    setModalEditarShow(false);
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
        fechaNacimiento: new Date(datos.fechaNacimiento).toISOString(),
        fechaIngreso: new Date(datos.fechaIngreso).toISOString(),
        cursos: [],
      };

      const creadoResponse = await crearPreceptor(nuevoPreceptor, token);
      toast.success(creadoResponse.mensaje || "Preceptor creado con éxito");
      cerrarModalCrear();
      const preceptoresActualizados = await listarPreceptores(token);
      setPreceptores(preceptoresActualizados.preceptores || []);
    } catch (error) {
      toast.error(error.message || "Error creando preceptor");
      console.error("Error al crear preceptor:", error);
    }
  };

  const handleUpdate = async (datos) => {
    try {
      const preceptorEditado = {
        id: datos.id,
        user: { id: datos.usuarioId },
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

      const editResponse = await editarPreceptor(preceptorEditado, token);
      toast.success(editResponse.mensaje || "Preceptor actualizado con éxito");
      cerrarModalEditar();
      const preceptoresActualizados = await listarPreceptores(token);
      setPreceptores(preceptoresActualizados.preceptores || []);
    } catch (error) {
      toast.error(error.message || "Error al actualizar preceptor");
      console.error("Error al actualizar preceptor:", error);
    }
  };

  const handleDelete = async () => {
    if (!preceptorSeleccionado) return;

    try {
      await eliminarPreceptor(preceptorSeleccionado.id, token);
      toast.success("Preceptor eliminado con éxito");
      cerrarModalEliminar();
      const preceptoresActualizados = await listarPreceptores(token);
      setPreceptores(preceptoresActualizados.preceptores || []);
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

  const preceptorVistaFormateado = preceptorSeleccionado
    ? {
        ...preceptorSeleccionado,
        fechaNacimiento: formatearFechaISO(preceptorSeleccionado.fechaNacimiento),
        fechaIngreso: formatearFechaISO(preceptorSeleccionado.fechaIngreso),
      }
    : null;

  return (
    <>
      <TablaGenerica
        titulo="Lista de Preceptores"
        columnas={columnasPreceptores}
        datos={preceptores}
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
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

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarModalEditar}
        campos={camposPreceptor(usuariosOptions, false, true, true)}
        formData={formData}
        onInputChange={handleInputChange}
        onUsuarioChange={handleUsuarioChange}
        onSubmit={handleUpdate}
        titulo="Editar Preceptor"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={preceptorVistaFormateado}
        campos={camposPreceptor([], true)}
        titulo={`Datos del preceptor: ${preceptorSeleccionado?.nombre} ${preceptorSeleccionado?.apellido}`}
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
