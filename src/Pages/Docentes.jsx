import React, { useEffect, useState } from 'react';
import TablaGenerica from '../Components/TablaLista';
import ModalVerEntidad from '../Components/ModalVerEntidad';
import ModalCrearEntidad from '../Components/ModalCrear';
import ModalEditarEntidad from '../Components/ModalEditarEntidad'; // tu modal editar separado
import { listarDocentes, crearDocente, editarDocente, eliminarDocente } from '../Services/DocenteService';

export default function Docentes() {
  const [docentes, setDocentes] = useState([]);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);

  useEffect(() => {
    fetchDocentes();
  }, []);

  const fetchDocentes = async () => {
    const datos = await listarDocentes();
    setDocentes(datos);
  };

  const handleView = (docente) => {
    setDocenteSeleccionado(docente);
    setModalVerShow(true);
  };

  const handleCreate = () => {
    setDocenteSeleccionado(null);
    setModalCrearShow(true);
  };

  const handleEdit = (docente) => {
    setDocenteSeleccionado(docente);
    setModalEditarShow(true);
  };

  const handleDelete = async (id) => {
    await eliminarDocente(id);
    fetchDocentes();
  };

  // Guardar docente nuevo
  const handleGuardarCrear = async (docente) => {
    await crearDocente(docente);
    setModalCrearShow(false);
    fetchDocentes();
  };

  // Guardar docente editado
  const handleGuardarEditar = async (docente) => {
    await editarDocente(docente.id, docente);
    setModalEditarShow(false);
    fetchDocentes();
  };

  const columnas = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'dni', label: 'DNI' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'ciudad', label: 'Ciudad' },
  ];

  const campos = [
  { name: 'nombre', label: 'Nombre', type: 'text' },
  { name: 'apellido', label: 'Apellido', type: 'text' },
  { name: 'dni', label: 'DNI', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'telefono', label: 'Teléfono', type: 'text' },
  { name: 'direccion', label: 'Dirección', type: 'text' },
  { name: 'ciudad', label: 'Ciudad', type: 'text' },
  { name: 'materia', label: 'Materia asignada', type: 'select', opciones: ['Matemática', 'Historia', 'Lengua'] },
];

  return (
    <>
      <TablaGenerica
        titulo="Lista de Docentes"
        columnas={columnas}
        datos={docentes}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(d) => handleDelete(d.id)}
        onCreate={handleCreate}
        textoCrear="Crear docente"
        campos={campos}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={docenteSeleccionado}
        campos={campos}
        titulo="Detalle del Docente"
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        onSubmit={handleGuardarCrear}
        campos={campos}
        titulo="Crear Docente"
      />

      <ModalEditarEntidad
        show={modalEditarShow}
        onClose={() => setModalEditarShow(false)}
        datos={docenteSeleccionado}
        onSubmit={handleGuardarEditar}
        campos={campos}
        titulo="Editar Docente"
      />
    </>
  );
}
