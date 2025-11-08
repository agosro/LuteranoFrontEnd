import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import { listarAlumnosExcluidos, reactivarAlumno } from '../Services/AlumnoService';
import TablaGenerica from '../Components/TablaLista';
import { toast } from 'react-toastify';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';

// Página especializada para reactivar alumnos excluidos.
// Solo muestra la lista de excluidos y ofrece acción directa de reactivación.
export default function ReactivarAlumnos() {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);

  const cargarExcluidos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarAlumnosExcluidos(user?.token);
      setAlumnos(data || []);
    } catch (e) {
      toast.error(e.message || 'Error cargando alumnos excluidos');
      setAlumnos([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => { if (user?.token) cargarExcluidos(); }, [user?.token, cargarExcluidos]);

  const columnas = [
    { key: 'nombreApellido', label: 'Nombre y Apellido', render: a => `${a.nombre} ${a.apellido}` },
    { key: 'dni', label: 'DNI' },
    { key: 'cursoActual', label: 'Último Curso', render: a => a?.cursoActual ? `${a.cursoActual.anio ?? ''}°${a.cursoActual.division ?? ''}` : '-' },
    { key: 'motivo', label: 'Motivo Exclusión', render: a => a?.motivoExclusion ?? 'Repeticiones' }
  ];

  const camposVista = [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'apellido', label: 'Apellido', type: 'text' },
    { name: 'dni', label: 'DNI', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'telefono', label: 'Teléfono', type: 'text' },
    { name: 'cursoActual', label: 'Curso Actual', render: c => c ? `${c.anio ?? ''}°${c.division ?? ''}` : '-' },
  ];

  const reactivar = async (alumno) => {
    try {
      await reactivarAlumno(user?.token, alumno.id);
      toast.success('Alumno reactivado');
      cargarExcluidos();
    } catch (e) {
      toast.error(e.message || 'Error reactivando alumno');
    }
  };

  if (loading) return <p>Cargando alumnos excluidos...</p>;

  return (
    <>
      <TablaGenerica
        titulo='Excluidos'
        columnas={columnas}
        datos={alumnos}
        onView={(a)=>{ setAlumnoSeleccionado(a); setModalVerShow(true); }}
        onDelete={null}
        extraButtons={(a)=>[
          {
            label: 'Reactivar',
            className: 'btn btn-sm btn-warning',
            onClick: ()=>reactivar(a)
          }
        ]}
        camposFiltrado={['nombre', 'apellido', 'dni']}
        placeholderBuscador='Buscar por nombre o DNI'
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={()=>{ setAlumnoSeleccionado(null); setModalVerShow(false); }}
        datos={alumnoSeleccionado}
        campos={camposVista}
        titulo={`Alumno: ${alumnoSeleccionado?.nombre} ${alumnoSeleccionado?.apellido}`}
        detallePathBase='alumnos'
      />
    </>
  );
}
