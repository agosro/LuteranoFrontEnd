import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const printRef = useRef(null);

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

  // Export CSV (respeta filtros actuales y los items mostrados)
  const exportCSV = () => {
    if (!items || items.length === 0) return;
    const header = ["Alumno", "Curso", "Tardanzas"];
    const rows = items.map(it => [
      getNombreAlumno(it),
      getNombreCurso(it),
      getCantidadTardanzas(it)
    ]);
    const csv = [header, ...rows]
      .map(cols => cols.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cursoLbl = modo === 'curso' ? (cursos.find(c=>String(c.value)===String(cursoId))?.label || String(cursoId||'')) : 'todos';
    const cursoSlug = cursoLbl.replace(/\s+/g, '_');
    const rangoSlug = (desde || hasta) ? `${(desde||'x')}_a_${(hasta||'x')}` : 'todos';
    const topSlug = (limit != null) ? `_top_${limit}` : '';
    a.download = `reporte_tardanzas_${cursoSlug}_${rangoSlug}${topSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir/PDF solo tabla
  const printOnlyTable = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      .sub { margin: 0 0 12px 0; color: #555; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
    `;
    const titulo = modo === 'curso' ? `Tardanzas · Curso ${cursos.find(c=>String(c.value)===String(cursoId))?.label || ''}` : 'Tardanzas · Todos los cursos';
    const fmt = (d) => {
      if (!d) return '';
      const parts = String(d).split('-');
      if (parts.length === 3) {
        const [y,m,day] = parts; return `${day}/${m}/${y}`;
      }
      return d;
    };
    const rango = (desde || hasta) ? `${fmt(desde)} – ${fmt(hasta)}` : 'Todos';
    const sub = `Rango: ${rango} · Top N: ${limit ?? ''}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Tardanzas</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(`<div class="sub">${sub}</div>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

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

      <div className="row g-2 mb-2">
        <div className="col-auto"><span className="badge text-bg-secondary">Total filas: {items.length}</span></div>
        <div className="col-auto"><span className="badge text-bg-warning text-dark">Total tardanzas: {totalTardanzas}</span></div>
      </div>
      {/* Acciones de exportación fuera del área imprimible */}
      <div className="d-flex justify-content-end gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={exportCSV} disabled={!items || items.length===0}>Exportar CSV</button>
        <button className="btn btn-outline-secondary btn-sm" onClick={printOnlyTable} disabled={!items || items.length===0}>Imprimir / PDF</button>
      </div>

      <div className="card">
        <div className="card-header"><strong>Resultados</strong></div>
        <div className="card-body p-0" ref={printRef}>
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
