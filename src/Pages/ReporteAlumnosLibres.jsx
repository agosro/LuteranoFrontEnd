
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { fetchAlumnosLibres } from '../Services/ReporteAlumnosLibresService';
import { toast } from 'react-toastify';

export default function ReporteAlumnosLibres() {
  const { user } = useAuth();
  const token = user?.token;

  const [modo, setModo] = useState('todos'); // 'todos' | 'curso'
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(20);
  const [cargando, setCargando] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const cs = await listarCursos(token);
        setCursos((cs || []).map(c => ({ value: c.id, label: `${c.anio || ''} ${c.division || ''}`.trim() })));
      } catch (e) {
        console.warn('No se pudieron cargar cursos para filtros de libres:', e);
      }
    })();
  }, [token]);

  const aniosPosibles = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map(String);
  }, []);

  const fetchReporte = async () => {
    try {
      setCargando(true);
      const cursoParam = (modo === 'curso' && cursoId) ? Number(cursoId) : null;
      const res = await fetchAlumnosLibres(Number(anio), cursoParam, token);
      const lista = Array.isArray(res?.libres) ? res.libres : [];
      setItems(lista);
      if (res?.code && res.code < 0) toast.error(res?.mensaje || 'Error en el reporte');
    } catch (e) {
      toast.error(e?.mensaje || e?.message || 'Error al obtener reporte');
      setItems([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) fetchReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const displayedItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a,b) => (Number(b?.inasistenciasAcum)||0) - (Number(a?.inasistenciasAcum)||0));
    if (limit && Number(limit) > 0) return arr.slice(0, Number(limit));
    return arr;
  }, [items, limit]);

  const totalFilas = displayedItems.length;
  const promedioInasist = useMemo(() => {
    if (!items || items.length === 0) return 0;
    const s = items.reduce((acc, it) => acc + (Number(it?.inasistenciasAcum) || 0), 0);
    return Math.round((s / items.length) * 10) / 10;
  }, [items]);

  const exportCSV = () => {
    if (!displayedItems || displayedItems.length === 0) return;
    const header = ["Alumno", "DNI", "Curso", "Nivel", "División", "Motivo", "Inasistencias"];
    const rows = displayedItems.map(it => [
      `${(it?.apellido || '').trim()} ${(it?.nombre || '').trim()}`.trim(),
      it?.dni ?? '',
      it?.cursoEtiqueta ?? `${it?.anio ?? ''}`.trim(),
      it?.nivel ?? '',
      it?.division ?? '',
      it?.motivo ?? '',
      it?.inasistenciasAcum ?? ''
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
    const topSlug = (limit != null) ? `_top_${limit}` : '';
    a.download = `reporte_alumnos_libres_${cursoSlug}_${anio}${topSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    const titulo = modo === 'curso' ? `Alumnos Libres · Curso ${cursos.find(c=>String(c.value)===String(cursoId))?.label || ''}` : 'Alumnos Libres · Todos los cursos';
  const sub = `Año: ${anio} · Top N: ${limit ?? ''}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Alumnos Libres</title><style>${css}</style></head><body>`);
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
        <h2 className="m-0 text-center">Reporte de Alumnos Libres</h2>
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
              <label className="form-label">Año</label>
              <select className="form-select" value={anio} onChange={(e) => setAnio(e.target.value)}>
                {aniosPosibles.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="col-sm-2">
              <label className="form-label">Top N</label>
              <input type="number" min={1} className="form-control" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
            </div>
            <div className="col-sm-12 d-flex justify-content-end">
              <button className="btn btn-primary" onClick={fetchReporte} disabled={cargando || (modo==='curso' && !cursoId)}>
                {cargando ? <><span className="spinner-border spinner-border-sm me-2" />Buscando...</> : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-auto"><span className="badge text-bg-secondary">Total filas: {totalFilas}</span></div>
        <div className="col-auto"><span className="badge text-bg-warning text-dark">Promedio inasistencias: {promedioInasist}</span></div>
      </div>
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
                  <th>DNI</th>
                  <th>Curso</th>
                  <th>Nivel</th>
                  <th>División</th>
                  <th>Motivo</th>
                  <th className="text-end">Inasistencias</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-3">Sin datos</td></tr>
                )}
                {items.map((it, idx) => {
                  const alumno = `${(it?.apellido || '').trim()} ${(it?.nombre || '').trim()}`.trim() || '-';
                  const curso = it?.cursoEtiqueta || `${it?.anio ?? ''}`.trim() || '-';
                  const cant = it?.inasistenciasAcum ?? 0;
                  return (
                    <tr key={idx}>
                      <td>{alumno}</td>
                      <td>{it?.dni ?? ''}</td>
                      <td>{curso}</td>
                      <td>{it?.nivel ?? ''}</td>
                      <td>{it?.division ?? ''}</td>
                      <td>{it?.motivo ?? ''}</td>
                      <td className="text-end"><span className={`badge ${cant > 25 ? 'text-bg-danger' : 'text-bg-warning text-dark'}`}>{cant}</span></td>
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
