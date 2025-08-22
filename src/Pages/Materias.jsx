import { useEffect, useState, useCallback } from 'react';
import TablaGenerica from '../Components/TablaLista';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import BotonCrear from '../Components/Botones/BotonCrear';
import { useAuth } from '../Context/AuthContext';
import { toast } from 'react-toastify';
import { FaUserPlus } from 'react-icons/fa';
import ModalAsignarDocentes from '../Components/Modals/ModalAsignarDocentes';

import {
  listarMaterias,
  crearMateria,
  actualizarMateria,
  eliminarMateria
} from '../Services/MateriaService';

import { camposMateria } from '../Entidades/camposMateria';

export default function ListaMaterias() {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  const [modalAsignarDocentes, setModalAsignarDocentes] = useState(false);
  const [materiaSeleccionadaAsignar, setMateriaSeleccionadaAsignar] = useState(null);
  const { user } = useAuth();
  const token = user?.token;

  // Estado para crear materia
  const [formDataCrear, setFormDataCrear] = useState({
    nombreMateria: "",
    descripcion: "",
    nivel: "",
  });

  const handleInputChangeCrear = (name, value) => {
    setFormDataCrear(prev => ({ ...prev, [name]: value }));
  };

  // Estado para editar materia
  const [formDataEditar, setFormDataEditar] = useState({});
  const handleInputChangeEditar = (name, value) => {
    setFormDataEditar(prev => ({ ...prev, [name]: value }));
  };

  // Carga de materias
  const cargarMaterias = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const materiasData = await listarMaterias(token);
      setMaterias(materiasData);
    } catch (error) {
      toast.error('Error cargando materias: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  // Crear materia
  const handleCreate = async (nuevaMateria) => {
    try {
      const creadoResponse = await crearMateria(token, nuevaMateria);
      toast.success(creadoResponse.mensaje || 'Materia creada con éxito');
      setModalCrearShow(false);
      setFormDataCrear({ nombreMateria: "", descripcion: "", nivel: "" });
      cargarMaterias();
    } catch (error) {
      toast.error(error.message || 'Error creando materia');
      console.error(error);
    }
  };

  // Editar materia
  const handleUpdate = async (materiaEditada) => {
    try {
      const editResponse = await actualizarMateria(token, materiaEditada);
      toast.success(editResponse.mensaje || 'Materia actualizada con éxito');
      setModalEditarShow(false);
      setMateriaSeleccionada(null);
      cargarMaterias();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar materia');
      console.error(error);
    }
  };

  // Eliminar materia
  const handleDeleteClick = (materia) => {
    setMateriaSeleccionada(materia);
    setMostrarModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    try {
      await eliminarMateria(token, materiaSeleccionada.id);
      setMaterias(prev => prev.filter(m => m.id !== materiaSeleccionada.id));
      toast.success('Materia eliminada con éxito');
    } catch (error) {
      toast.error('Error al eliminar materia');
      console.error(error);
    } finally {
      setMostrarModalEliminar(false);
    }
  };

  const handleView = (materia) => {
    setMateriaSeleccionada(materia);
    setModalVerShow(true);
  };

  const handleEdit = (materia) => {
  setMateriaSeleccionada(materia); // esto siempre tiene id
  setFormDataEditar({ 
    nombreMateria: materia.nombreMateria || '',
    descripcion: materia.descripcion || '',
    nivel: materia.nivel || ''
  });
  setModalEditarShow(true);
};

  // Abrir modal de asignación de docentes
  const handleAsignarDocente = (materia) => {
    setMateriaSeleccionadaAsignar(materia);
    setModalAsignarDocentes(true);
  };

  if (loading) return <p>Cargando materias...</p>;

  const columnasMaterias = [
    { key: 'nombreMateria', label: 'Nombre de la materia' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'nivel',
      label: 'Nivel',
      render: (m) => m.nivel ?? 'Sin nivel',
    },
  ];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Materias"
        columnas={columnasMaterias}
        datos={materias}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        camposFiltrado={['nombreMateria', 'descripcion']}
        botonCrear={<BotonCrear texto="Crear materia" onClick={() => setModalCrearShow(true)} />}
        placeholderBuscador="Buscar por nombre o descripción"
        extraButtons={(materia) => [
        {
          icon: <FaUserPlus />,
          onClick: () => handleAsignarDocente(materia),
          title: "Asignar Docentes"
        }
      ]}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={materiaSeleccionada}
        campos={camposMateria(true)}
        titulo="Detalle de la Materia"
      />

      <ConfirmarEliminar
        show={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={confirmarEliminar}
        item={materiaSeleccionada}
        tipo="materia"
      />

      {/* Modal Editar */}
      {materiaSeleccionada && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={() => setModalEditarShow(false)}
          datosIniciales={materiaSeleccionada} // para referencias como id
          formData={formDataEditar}             // para inputs editables
          campos={camposMateria(false)}
          onInputChange={handleInputChangeEditar}
          onSubmit={handleUpdate}
        />
      )}

      {materiaSeleccionadaAsignar && (
        <ModalAsignarDocentes
          show={modalAsignarDocentes}
          onClose={() => setModalAsignarDocentes(false)}
          materia={materiaSeleccionadaAsignar}
          token={token}
          onActualizar={cargarMaterias} // se encarga de recargar la lista tras guardar
        />
      )}

      {/* Modal Crear */}
      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposMateria(false)}
        onSubmit={handleCreate}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        titulo="Crear Materia"
      />
    </>
  );
}
  