import React, { useEffect, useMemo, useState } from 'react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarTardanzasPorCurso, listarTardanzasTodos } from '../Services/ReporteTardanzaService';
import { toast } from 'react-toastify';

export default function ReporteTardanzas() {
  const { user } = useAuth();
  const token = user?.token;

  const [modo, setModo] = useState('todos'); // 'todos' | 'curso'
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const cs = await listarCursos(token);
        setCursos((cs || []).map(c => ({ value: c.id, label: `${c.anio || ''} ${c.division || ''}`.trim() })));
      } catch (e) {
        console.warn('No se pudieron cargar cursos para filtros de tardanza:', e);
      }
    })();
  }, [token]);

  const fetchReporte = async () => {
    try {
      setCargando(true);
      const params = { desde: desde || undefined, hasta: hasta || undefined, limit: limit ?? undefined };
      let data = [];
      if (modo === 'curso') {
        if (!cursoId) { toast.info('Seleccioná un curso'); setCargando(false); return; }
        data = await listarTardanzasPorCurso(token, { ...params, cursoId: Number(cursoId) });
      } else {
        data = await listarTardanzasTodos(token, params);
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'Error al obtener reporte');
    } finally {
      setCargando(false);
    }
  };

  const getNombreAlumno = (it) => {
    const ape = it?.apellido?.trim() || '';
    const nom = it?.nombre?.trim() || '';
    const full = `${ape} ${nom}`.trim();
    return full || '-';
  };

  const getNombreCurso = (it) => {
    const anio = it?.cursoAnio;
    const division = it?.cursoDivision;
    if (anio == null && !division) return '-';
    return `${anio ?? ''} ${division ?? ''}`.trim();
  };

  const getCantidadTardanzas = (it) => (it?.cantidadTardanzas ?? 0);

  const totalTardanzas = useMemo(() => items.reduce((acc, it) => acc + (it?.cantidadTardanzas ?? 0), 0), [items]);

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton /></div>
      <div className="d-flex align-items-center justify-content-center mb-3">
        <h2 className="m-0 text-center">Reporte de Tardanzas</h2>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-3">
              <label className="form-label">Modo</label>
              <select className="form-select" value={modo} onChange={(e) => setModo(e.target.value)}>
                <option value="todos">Todos los cursos</option>
                <option value="curso">Por curso</option>
              </select>
            </div>
            {modo === 'curso' && (
              <div className="col-sm-3">
                <label className="form-label">Curso</label>
                <select className="form-select" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {cursos.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            )}
            <div className="col-sm-2">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="col-sm-2">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="col-sm-2">
              <label className="form-label">Top N</label>
              <input type="number" min={1} className="form-control" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
            </div>
            <div className="col-sm-12 d-flex justify-content-end">
              <button className="btn btn-primary" onClick={fetchReporte} disabled={cargando}>
                {cargando ? <><span className="spinner-border spinner-border-sm me-2" />Buscando...</> : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-auto"><span className="badge text-bg-secondary">Total filas: {items.length}</span></div>
        <div className="col-auto"><span className="badge text-bg-warning text-dark">Total tardanzas: {totalTardanzas}</span></div>
      </div>

      <div className="card">
        <div className="card-header"><strong>Resultados</strong></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Alumno</th>
                  <th>Curso</th>
                  <th className="text-end">Tardanzas</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-muted py-3">Sin datos</td></tr>
                )}
                {items.map((it, idx) => {
                  const alumno = getNombreAlumno(it);
                  const curso = getNombreCurso(it);
                  const cant = getCantidadTardanzas(it);
                  return (
                    <tr key={idx}>
                      <td>{alumno}</td>
                      <td>{curso}</td>
                      <td className="text-end"><span className="badge text-bg-warning text-dark">{cant}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
