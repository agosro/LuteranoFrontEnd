import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { camposEspacioAulico } from "../Entidades/camposEspacioAulico";
import { listarEspaciosAulicos, crearEspacioAulico, editarEspacioAulico, eliminarEspacioAulico } from "../Services/EspacioAulicoService";

export default function EspaciosAulicosGestion() {
  const { user } = useAuth();
  const token = user?.token;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [seleccionado, setSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!token) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const data = await listarEspaciosAulicos(token);
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e?.message || "Error cargando espacios áulicos");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [token]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Abrir
  const abrirCrear = () => { setFormData({}); setSeleccionado(null); setModalCrearShow(true); };
  const abrirEditar = (item) => {
    setSeleccionado(item);
    setFormData({ id: item.id, nombre: item.nombre, ubicacion: item.ubicacion, capacidad: item.capacidad });
    setModalEditarShow(true);
  };
  const abrirVer = (item) => { setSeleccionado(item); setModalVerShow(true); };
  const abrirEliminar = (item) => { setSeleccionado(item); setModalEliminarShow(true); };

  // Cerrar
  const cerrarCrear = () => { setFormData({}); setModalCrearShow(false); };
  const cerrarEditar = () => { setSeleccionado(null); setFormData({}); setModalEditarShow(false); };
  const cerrarVer = () => { setSeleccionado(null); setModalVerShow(false); };
  const cerrarEliminar = () => { setSeleccionado(null); setModalEliminarShow(false); };

  // CRUD
  const handleCreate = async (datos) => {
    try {
      const payload = {
        nombre: datos.nombre,
        ubicacion: datos.ubicacion,
        capacidad: datos.capacidad ? Number(datos.capacidad) : null,
      };
      const res = await crearEspacioAulico(token, payload);
      const creado = res.espacioAulicoDto || res.espacio || res.data || payload; // fallback
      setItems(prev => [...prev, creado]);
      toast.success(res.mensaje || "Espacio creado");
      cerrarCrear();
    } catch (e) {
      toast.error(e?.message || "Error al crear espacio");
    }
  };

  const handleUpdate = async (datos) => {
    try {
      const payload = {
        id: datos.id,
        nombre: datos.nombre,
        ubicacion: datos.ubicacion,
        capacidad: datos.capacidad ? Number(datos.capacidad) : null,
      };
      const res = await editarEspacioAulico(token, payload);
      const actualizado = res.espacioAulicoDto || res.espacio || payload;
      setItems(prev => prev.map(it => it.id === actualizado.id ? actualizado : it));
      toast.success(res.mensaje || "Espacio actualizado");
      cerrarEditar();
    } catch (e) {
      toast.error(e?.message || "Error al actualizar espacio");
    }
  };

  const handleDelete = async () => {
    if (!seleccionado) return;
    try {
      await eliminarEspacioAulico(token, seleccionado.id);
      setItems(prev => prev.filter(it => it.id !== seleccionado.id));
      toast.success("Espacio eliminado");
      cerrarEliminar();
    } catch (e) {
      toast.error(e?.message || "Error al eliminar espacio");
    }
  };

  if (loading) return <p>Cargando espacios áulicos...</p>;

  const columnas = [
    { key: "nombre", label: "Nombre" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "capacidad", label: "Capacidad" },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Espacios Áulicos"
        columnas={columnas}
        datos={items}
        onView={abrirVer}
        onEdit={abrirEditar}
        onDelete={abrirEliminar}
        botonCrear={<BotonCrear texto="Crear Espacio" onClick={abrirCrear} />}
        camposFiltrado={["nombre", "ubicacion"]}
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarCrear}
        campos={camposEspacioAulico(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleCreate}
        titulo="Crear Espacio Áulico"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarEditar}
        campos={camposEspacioAulico(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleUpdate}
        titulo="Editar Espacio Áulico"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarVer}
        datos={seleccionado}
        campos={camposEspacioAulico(true)}
        titulo={`Datos del espacio: ${seleccionado?.nombre || ''}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarEliminar}
        onConfirm={handleDelete}
        item={seleccionado}
        tipo="espacio áulico"
      />
    </>
  );
}
