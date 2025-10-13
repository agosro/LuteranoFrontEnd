import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { listarDocentes } from '../Services/DocenteService';
import {
  listarAsistenciasDocentesPorFecha,
  upsertAsistenciaDocente,
} from '../Services/AsistenciaDocenteService';
import { toast } from 'react-toastify';
import FiltrosAsistencia from '../Components/Asistencia/FiltrosAsistencia';
import TablaAsistencia from '../Components/Asistencia/TablaAsistencia';
import ModalEditarAsistencia from '../Components/Asistencia/ModalEditarAsistencia';

export default function AsistenciaDocentes() {
  const { user } = useAuth();
  const token = user?.token;

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [docentes, setDocentes] = useState([]);
  const [asistencia, setAsistencia] = useState({}); // { [docenteId]: { estado, observacion } }
  const [presentes, setPresentes] = useState(new Set());
  const [modalEdit, setModalEdit] = useState({ open: false, docente: null, estado: 'TARDE', observacion: '' });
  const [cargando, setCargando] = useState(false);

  // Cargar docentes
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setCargando(true);
        const lista = await listarDocentes(token);
        const ordenados = [...(lista || [])].sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
        setDocentes(ordenados);
      } catch (e) {
        toast.error(e.message || 'Error al cargar docentes');
      } finally {
        setCargando(false);
      }
    })();
  }, [token]);

  // Cargar asistencias del día
  useEffect(() => {
    if (!token || !fecha) return;
    (async () => {
      try {
        setCargando(true);
        const items = await listarAsistenciasDocentesPorFecha(token, fecha);
        const map = {};
        const presentesSet = new Set();
        for (const it of items) {
          if (it.docenteId) {
            map[it.docenteId] = { estado: it.estado || '', observacion: it.observacion || '' };
            if (it.estado === 'PRESENTE' || it.estado === 'TARDE') presentesSet.add(it.docenteId);
          }
        }
        setAsistencia(map);
        setPresentes(presentesSet);
      } catch (e) {
        toast.error(e.message || 'Error al cargar asistencias');
      } finally {
        setCargando(false);
      }
    })();
  }, [token, fecha]);

  // Toggle presente (solo en memoria; se confirma con Guardar)
  const handleTogglePresente = (docenteId) => {
    setPresentes((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(docenteId)) nuevo.delete(docenteId); else nuevo.add(docenteId);
      return nuevo;
    });
  };

  const abrirModalEditar = (docente) => {
    const actual = asistencia[docente.id] || { estado: '', observacion: '' };
    setModalEdit({
      open: true,
      docente: { ...docente, tipo: 'Docente' },
      estado: actual.estado === 'TARDE' || actual.estado === 'JUSTIFICADO' ? actual.estado : 'TARDE',
      observacion: actual.observacion || '',
    });
  };
  const cerrarModalEditar = () => setModalEdit({ open: false, docente: null, estado: 'TARDE', observacion: '' });

  const guardarEdicionModal = async () => {
    if (!modalEdit.docente) return;
    try {
      setCargando(true);
      const resp = await upsertAsistenciaDocente(token, {
        docenteId: Number(modalEdit.docente.id),
        fecha,
        estado: modalEdit.estado,
        observacion: modalEdit.observacion || '',
      });
      if (resp?.code && resp.code < 0) throw new Error(resp.mensaje || 'Error al actualizar');
      // Actualizar en memoria y sincronizar checkbox: TARDE => presente, JUSTIFICADO => no presente
      setAsistencia((prev) => ({
        ...prev,
        [modalEdit.docente.id]: { estado: modalEdit.estado, observacion: modalEdit.observacion || '' },
      }));
      setPresentes((prev) => {
        const nuevo = new Set(prev);
        if (modalEdit.estado === 'TARDE') nuevo.add(modalEdit.docente.id);
        if (modalEdit.estado === 'JUSTIFICADO') nuevo.delete(modalEdit.docente.id);
        return nuevo;
      });
      toast.success('Edición guardada');
      cerrarModalEditar();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setCargando(false);
    }
  };

  // Guardado masivo: recorrer todos los docentes y aplicar upsert según selección rápida
  const handleGuardarMasivo = async () => {
    if (!token || !fecha || docentes.length === 0) return;
    try {
      setCargando(true);
      const presentesIds = Array.from(presentes);

      // Confirmaciones amigables
      if (presentesIds.length === 0) {
        const confirmar = window.confirm('No seleccionaste ningún docente como presente. Se marcarán todos como AUSENTE. ¿Deseás continuar?');
        if (!confirmar) { setCargando(false); return; }
      }
      if (presentesIds.length === docentes.length) {
        const confirmar = window.confirm('Seleccionaste a todos como PRESENTES. ¿Confirmás guardar así?');
        if (!confirmar) { setCargando(false); return; }
      }

      // Ejecutar upserts: presentes => PRESENTE; no seleccionados => AUSENTE;
      // Respetar estado puntual existente TARDE/JUSTIFICADO/CON_LICENCIA
      for (const d of docentes) {
        const actual = asistencia[d.id]?.estado || '';
        let estadoFinal = 'AUSENTE';
        if (presentes.has(d.id)) {
          // si ya estaba TARDE, mantener TARDE; si JUSTIFICADO, respetar JUSTIFICADO aunque no esté presente
          estadoFinal = (actual === 'TARDE') ? 'TARDE' : 'PRESENTE';
        } else {
          if (actual === 'JUSTIFICADO') estadoFinal = 'JUSTIFICADO';
          if (actual === 'CON_LICENCIA') estadoFinal = 'CON_LICENCIA';
        }
        await upsertAsistenciaDocente(token, {
          docenteId: Number(d.id),
          fecha,
          estado: estadoFinal,
          observacion: asistencia[d.id]?.observacion || '',
        });
      }

      toast.success('Asistencia guardada');
      // Refrescar estados desde backend
      const items = await listarAsistenciasDocentesPorFecha(token, fecha);
      const map = {};
      const presentesSet = new Set();
      for (const it of items) {
        if (it.docenteId) {
          map[it.docenteId] = { estado: it.estado || '', observacion: it.observacion || '' };
          if (it.estado === 'PRESENTE' || it.estado === 'TARDE') presentesSet.add(it.docenteId);
        }
      }
      setAsistencia(map);
      setPresentes(presentesSet);
    } catch (e) {
      toast.error(e.message || 'No se pudo guardar asistencia');
    } finally {
      setCargando(false);
    }
  };

  const marcarTodosPresentes = () => {
    if (!docentes.length) return;
    setPresentes(new Set(docentes.map((d) => d.id)));
  };
  const limpiarSeleccion = () => setPresentes(new Set());

  const personasTabla = useMemo(() => (
    docentes.map((d) => ({ id: d.id, dni: d.dni, nombre: `${d.apellido ?? ''} ${d.nombre ?? ''}`.trim(), apellido: d.apellido, tipo: 'Docente' }))
  ), [docentes]);

  const contadores = useMemo(() => {
    const counts = { PRESENTE: 0, AUSENTE: 0, TARDE: 0, JUSTIFICADO: 0, CON_LICENCIA: 0, SIN_SELECCION: 0, TOTAL: docentes.length, PRESENTE_INCLUYE_TARDE: 0 };
    for (const d of docentes) {
      const est = asistencia[d.id]?.estado || '';
      if (!est) counts.SIN_SELECCION += 1; else if (counts[est] !== undefined) counts[est] += 1;
      if (est === 'PRESENTE' || est === 'TARDE') counts.PRESENTE_INCLUYE_TARDE += 1;
    }
    return counts;
  }, [docentes, asistencia]);

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton /></div>
      <div className="d-flex align-items-center justify-content-center mb-3">
        <h2 className="m-0 text-center">Asistencia de Docentes</h2>
      </div>

      <FiltrosAsistencia
        cursos={[]}
        cursoId={''}
        setCursoId={() => {}}
        fecha={fecha}
        setFecha={setFecha}
        onMarcarTodosPresentes={marcarTodosPresentes}
        onLimpiarSeleccion={limpiarSeleccion}
        disableAcciones={!docentes.length}
        mostrarCurso={false}
        etiquetaFecha="Fecha"
      />

      <div className="row g-2 mb-3">
        <div className="col-auto"><span className="badge text-bg-secondary">Total: {contadores.TOTAL}</span></div>
  <div className="col-auto"><span className="badge text-bg-success">Presentes: {contadores.PRESENTE}</span></div>
  <div className="col-auto"><span className="badge text-bg-success">Presentes (incluye TARDE): {contadores.PRESENTE_INCLUYE_TARDE}</span></div>
        <div className="col-auto"><span className="badge text-bg-danger">Ausentes: {contadores.AUSENTE}</span></div>
        <div className="col-auto"><span className="badge text-bg-warning text-dark">Tarde: {contadores.TARDE}</span></div>
        <div className="col-auto"><span className="badge text-bg-primary">Justificados: {contadores.JUSTIFICADO}</span></div>
        <div className="col-auto"><span className="badge text-bg-primary">Con licencia: {contadores.CON_LICENCIA}</span></div>
        <div className="col-auto"><span className="badge text-bg-light text-dark">Sin selección: {contadores.SIN_SELECCION}</span></div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Listado de docentes</strong>
          <button className="btn btn-primary" onClick={handleGuardarMasivo} disabled={!fecha || cargando || !docentes.length}>
            {cargando ? (<><span className="spinner-border spinner-border-sm me-2" />Guardando...</>) : 'Guardar asistencia del día'}
          </button>
        </div>
        <div className="card-body p-0">
          <TablaAsistencia
            personas={personasTabla}
            asistenciaPorId={asistencia}
            presentes={presentes}
            onTogglePresente={handleTogglePresente}
            onClickEditar={abrirModalEditar}
            disabled={cargando}
          />
        </div>
      </div>

      <ModalEditarAsistencia
        open={modalEdit.open}
        persona={modalEdit.docente}
        estado={modalEdit.estado}
        observacion={modalEdit.observacion}
        setEstado={(v) => setModalEdit((m) => ({ ...m, estado: v }))}
        setObservacion={(v) => setModalEdit((m) => ({ ...m, observacion: v }))}
        onClose={cerrarModalEditar}
        onSave={guardarEdicionModal}
        cargando={cargando}
        incluirLicencia={true}
      />

      <div className="mt-2 text-muted">⚠️ Los docentes no seleccionados se guardarán como Ausentes, salvo que estén Justificados.</div>
    </div>
  );
}
