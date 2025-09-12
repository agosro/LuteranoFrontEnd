import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import TablaGenerica from "../Components/TablaLista";
import ModalVerEntidad from "../Components/Modals/ModalVerEntidad";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import ModalEditarEntidad from "../Components/Modals/ModalEditarEntidad";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar";
import BotonCrear from "../Components/Botones/BotonCrear";
import { toast } from "react-toastify";
import { camposAula } from "../Entidades/camposAula";
import { listarAulas, crearAula, editarAula, eliminarAula } from "../Services/AulaService";
import { listarCursos } from "../Services/CursoService";

export default function ListaAulas() {
  const { user } = useAuth();
  const token = user?.token;

  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursosOptions, setCursosOptions] = useState([]);

  // Modales
  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEliminarShow, setModalEliminarShow] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Traer cursos para tener nombres disponibles
        const cursosData = await listarCursos(token);
        const cursosOptionsData = (cursosData || []).map(c => ({
          value: c.id,
          label: `${c.anio} ${c.division}`
        }));
        setCursosOptions(cursosOptionsData);

        // Traer aulas
        const aulasData = await listarAulas(token);

        // Asociar cada aula con su curso (si tiene)
        const aulasConCurso = (aulasData || []).map(aula => ({
          ...aula,
          curso: cursosOptionsData.find(c => c.value === aula.cursoId) || null
        }));

        console.log("Aulas cargadas con curso:", aulasConCurso);
        setAulas(aulasConCurso);
      } catch (error) {
        toast.error("Error cargando aulas: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [token]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Abrir modales
  const abrirModalCrear = () => { setFormData({}); setAulaSeleccionada(null); setModalCrearShow(true); };
  const abrirModalEditar = (aula) => {
    setAulaSeleccionada(aula);
    setFormData({
      id: aula.id,
      nombre: aula.nombre,
      ubicacion: aula.ubicacion,
      capacidad: aula.capacidad,
      cursoId: aula.curso?.value || ""
    });
    setModalEditarShow(true);
  };
  const abrirModalVer = (aula) => { setAulaSeleccionada(aula); setModalVerShow(true); };
  const abrirModalEliminar = (aula) => { setAulaSeleccionada(aula); setModalEliminarShow(true); };

  // Cerrar modales
  const cerrarModalCrear = () => { setFormData({}); setModalCrearShow(false); };
  const cerrarModalEditar = () => { setAulaSeleccionada(null); setFormData({}); setModalEditarShow(false); };
  const cerrarModalVer = () => { setAulaSeleccionada(null); setModalVerShow(false); };
  const cerrarModalEliminar = () => { setAulaSeleccionada(null); setModalEliminarShow(false); };

  // CRUD
  const handleCreate = async (datos) => {
  try {
    const payload = {
      nombre: datos.nombre,
      ubicacion: datos.ubicacion,
      capacidad: datos.capacidad ? Number(datos.capacidad) : null,
      cursoId: datos.cursoId || null
    };

    console.log("Payload crear aula:", payload);

    // Crear aula y obtener el objeto creado directamente
    const nuevaAula = await crearAula(token, payload);

    // Asociamos curso si hay cursosOptions
    const aulaConCurso = {
      ...nuevaAula,
      curso: cursosOptions.find(c => c.value === nuevaAula.cursoId) || null
    };

    // Actualizamos el estado de aulas inmediatamente
    setAulas(prev => [...prev, aulaConCurso]);

    toast.success("Aula creada con éxito");
    cerrarModalCrear();

  } catch (error) {
    console.error("Error al crear aula:", error);
    toast.error(error.message || "Error creando aula");
  }
};

  const handleUpdate = async (datos) => {
  try {
    const payload = {
      id: datos.id,
      nombre: datos.nombre,
      ubicacion: datos.ubicacion,
      capacidad: datos.capacidad ? Number(datos.capacidad) : null,
      cursoId: datos.cursoId || null
    };

    const aulaActualizada = await editarAula(token, payload);
    toast.success("Aula actualizada con éxito");
    cerrarModalEditar();

    // Actualizamos el estado local reemplazando solo el aula editada
    setAulas(prev => prev.map(aula =>
      aula.id === aulaActualizada.id
        ? { ...aulaActualizada, curso: cursosOptions.find(c => c.value === aulaActualizada.cursoId) || null }
        : aula
    ));
  } catch (error) {
    console.error("Error al actualizar aula:", error);
    toast.error(error.message || "Error actualizando aula");
  }
};

  const handleDelete = async () => {
  if (!aulaSeleccionada) return;
  try {
    await eliminarAula(token, aulaSeleccionada.id);
    toast.success("Aula eliminada con éxito");
    cerrarModalEliminar();

    // Eliminamos el aula directamente del estado
    setAulas(prev => prev.filter(aula => aula.id !== aulaSeleccionada.id));
  } catch (error) {
    toast.error(error.message || "Error eliminando aula");
  }
};

  if (loading) return <p>Cargando aulas...</p>;

  const columnasAulas = [
    { key: "nombre", label: "Nombre" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "capacidad", label: "Capacidad" },
    { 
      key: "curso", 
      label: "Curso", 
      render: a => a.curso ? a.curso.label : "Sin curso asignado"
    }
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Aulas"
        columnas={columnasAulas}
        datos={aulas}
        onView={abrirModalVer}
        onEdit={abrirModalEditar}
        onDelete={abrirModalEliminar}
        botonCrear={<BotonCrear texto="Crear Aula" onClick={abrirModalCrear} />}
        camposFiltrado={["nombre", "ubicacion"]} // para que el buscador funcione
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposAula(false, cursosOptions)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleCreate}
        titulo="Crear Aula"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={cerrarModalEditar}
        campos={camposAula(false, cursosOptions)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleUpdate}
        titulo="Editar Aula"
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={cerrarModalVer}
        datos={aulaSeleccionada}
        campos={camposAula(true, cursosOptions)}
        titulo={`Datos del aula: ${aulaSeleccionada?.nombre}`}
      />

      <ConfirmarEliminar
        show={modalEliminarShow}
        onClose={cerrarModalEliminar}
        onConfirm={handleDelete}
        item={aulaSeleccionada}
        tipo="aula"
      />
    </>
  );
}