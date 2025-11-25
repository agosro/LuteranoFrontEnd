import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Accordion, Collapse, Table } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { useOpenedInNewTab } from '../Context/useOpenedInNewTab';
import { listarCursos, listarCursosPorPreceptor } from '../Services/CursoService';
import { listarTardanzasPorCurso, listarTardanzasTodos } from '../Services/ReporteTardanzaService';
import { toast } from 'react-toastify';

export default function ReporteTardanzas() {
  const { user } = useAuth();
  const isNewTab = useOpenedInNewTab();
  const token = user?.token;
  const navigate = useNavigate();

  const [modo, setModo] = useState(user?.rol === 'ROLE_PRECEPTOR' ? 'curso' : 'todos'); // 'todos' | 'curso'
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        let cs = [];
        if (user?.rol === 'ROLE_PRECEPTOR' && user?.preceptorId) {
          cs = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          cs = await listarCursos(token);
        }
        setCursos((cs || []).map(c => ({ value: c.id, label: `${c.anio || ''} ${c.division || ''}`.trim() })));
      } catch (e) {
        console.warn('No se pudieron cargar cursos para filtros de tardanza:', e);
      }
    })();
  }, [token, user]);

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

  const toggleRow = (alumnoId) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(alumnoId)) {
      newSet.delete(alumnoId);
    } else {
      newSet.add(alumnoId);
    }
    setExpandedRows(newSet);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return fecha;
    }
  };

  const totalTardanzas = useMemo(() => items.reduce((acc, it) => acc + (it?.cantidadTardanzas ?? 0), 0), [items]);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!items || items.length === 0) return null;

    const tardanzas = items.map(it => Number(it?.cantidadTardanzas) || 0);
    const totalAlumnos = items.length;
    const promedioTardanzas = totalAlumnos > 0 ? (totalTardanzas / totalAlumnos).toFixed(1) : 0;
    const tardanzaMinima = Math.min(...tardanzas);
    const tardanzaMaxima = Math.max(...tardanzas);

    // Distribución por rangos de tardanzas
    const distribucion = [
      { rango: '1-2', count: 0, color: '#28a745' },
      { rango: '3-5', count: 0, color: '#17a2b8' },
      { rango: '6-10', count: 0, color: '#ffc107' },
      { rango: '11-20', count: 0, color: '#fd7e14' },
      { rango: '21+', count: 0, color: '#dc3545' }
    ];

    tardanzas.forEach(tard => {
      if (tard >= 1 && tard <= 2) distribucion[0].count++;
      else if (tard >= 3 && tard <= 5) distribucion[1].count++;
      else if (tard >= 6 && tard <= 10) distribucion[2].count++;
      else if (tard >= 11 && tard <= 20) distribucion[3].count++;
      else if (tard >= 21) distribucion[4].count++;
    });

    // Distribución por curso (si hay varios cursos)
    const cursoCounts = {};
    items.forEach(it => {
      const curso = getNombreCurso(it);
      if (!cursoCounts[curso]) {
        cursoCounts[curso] = { total: 0, alumnos: 0 };
      }
      cursoCounts[curso].total += Number(it?.cantidadTardanzas) || 0;
      cursoCounts[curso].alumnos += 1;
    });

    const cursoData = Object.entries(cursoCounts)
      .map(([curso, data]) => ({
        curso,
        tardanzas: data.total,
        promedio: (data.total / data.alumnos).toFixed(1),
        alumnos: data.alumnos
      }))
      .sort((a, b) => b.tardanzas - a.tardanzas);

    // Top 5 alumnos con más tardanzas
    const top5 = [...items]
      .sort((a, b) => (Number(b?.cantidadTardanzas) || 0) - (Number(a?.cantidadTardanzas) || 0))
      .slice(0, 5)
      .map(it => ({
        nombre: getNombreAlumno(it).substring(0, 20),
        tardanzas: Number(it?.cantidadTardanzas) || 0
      }));

    return {
      totalAlumnos,
      totalTardanzas,
      promedioTardanzas,
      tardanzaMinima,
      tardanzaMaxima,
      distribucion,
      cursoData,
      top5,
      mostrarCursos: modo === 'todos' && cursoData.length > 1
    };
  }, [items, totalTardanzas, modo]);

  // Export CSV (respeta filtros actuales y los items mostrados)
  const exportCSV = () => {
    if (!items || items.length === 0) return;
    const header = ["Alumno", "DNI", "Curso", "Tardanzas"];
    const rows = items.map(it => [
      getNombreAlumno(it),
      it.dni || '',
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

  // Imprimir/PDF solo tabla, mostrando todos los detalles expandidos
  const printOnlyTable = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      .sub { margin: 0 0 12px 0; color: #555; font-size: 12px; }
      .kpi-section { margin: 0 0 16px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
      .kpi-card { padding: 8px; border: 1px solid #ccc; background: #fff; }
      .kpi-label { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; }
      .kpi-value { font-size: 18px; font-weight: bold; }
      .dist-list { margin: 8px 0 0 0; padding-left: 0; list-style: none; font-size: 11px; }
      .dist-list li { margin-bottom: 2px; }
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

    // KPIs en PDF
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Tardanzas</div><div class="kpi-value">${kpisData.totalTardanzas}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio por Alumno</div><div class="kpi-value">${kpisData.promedioTardanzas}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Máximo</div><div class="kpi-value">${kpisData.tardanzaMaxima}</div><div style="font-size:10px;color:#666;">Mínimo: ${kpisData.tardanzaMinima}</div></div>`);
      win.document.write(`</div>`);

      // Distribución
      win.document.write(`<div><strong style="font-size:11px;">Distribución por rangos:</strong><ul class="dist-list">`);
      kpisData.distribucion.forEach(d => {
        win.document.write(`<li>${d.rango} tardanzas: ${d.count} alumnos</li>`);
      });
      win.document.write(`</ul></div>`);
      win.document.write(`</div>`);
    }

    // Tabla de resultados con detalles expandidos
    win.document.write('<div class="table-responsive"><table class="table table-hover align-middle mb-0">');
    win.document.write('<thead class="table-light"><tr><th>Alumno</th><th>DNI</th><th>Curso</th><th class="text-end">Tardanzas</th><th></th></tr></thead>');
    win.document.write('<tbody>');
    if (!items || items.length === 0) {
      win.document.write('<tr><td colspan="5" class="text-center text-muted py-3">Sin datos</td></tr>');
    } else {
      items.forEach((it) => {
        const alumno = getNombreAlumno(it);
        const curso = getNombreCurso(it);
        const cant = getCantidadTardanzas(it);
        const tieneDetalles = Array.isArray(it.detalles) && it.detalles.length > 0;
        win.document.write('<tr>');
        win.document.write(`<td>${alumno}</td>`);
        win.document.write(`<td>${it.dni || '-'}</td>`);
        win.document.write(`<td>${curso}</td>`);
        win.document.write(`<td class="text-end"><span class="badge text-bg-warning text-dark">${cant}</span></td>`);
        win.document.write('<td></td>');
        win.document.write('</tr>');
        // Detalle expandido siempre
        if (tieneDetalles) {
          win.document.write('<tr class="table-light"><td colspan="5"><div class="p-3">');
          win.document.write(`<h6 class="mb-3"><span style="vertical-align:middle;">&#128197;</span> Detalle de tardanzas (${it.detalles.length})</h6>`);
          win.document.write('<div class="table-responsive"><table class="table table-sm mb-0" style="font-size:0.9rem"><thead class="table-secondary"><tr><th style="width:25%">Fecha</th><th>Observación</th></tr></thead><tbody>');
          it.detalles.forEach((detalle) => {
            win.document.write('<tr>');
            win.document.write(`<td><strong>${formatFecha(detalle.fecha)}</strong></td>`);
            win.document.write('<td>');
            if (detalle.observacion) {
              win.document.write(`<div class="d-flex align-items-start gap-2"><span style="vertical-align:middle;">&#9888;&#65039;</span><span>${detalle.observacion}</span></div>`);
            } else {
              win.document.write('<span class="text-muted">-</span>');
            }
            win.document.write('</td>');
            win.document.write('</tr>');
          });
          win.document.write('</tbody></table></div></div></td></tr>');
        }
      });
    }
    win.document.write('</tbody></table></div>');

    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton hidden={isNewTab} /></div>
      <div className="d-flex align-items-center justify-content-center mb-2">
        <h2 className="m-0 text-center">Reporte de Tardanzas</h2>
      </div>
      <p className="text-muted text-center mb-3">
        Este reporte muestra la cantidad de tardanzas acumuladas por alumno en el período seleccionado. Hacé clic en el nombre del alumno para ver su detalle completo.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-3">
              <label className="form-label">Modo</label>
              <select 
                className="form-select" 
                value={modo} 
                onChange={(e) => setModo(e.target.value)}
                disabled={user?.rol === 'ROLE_PRECEPTOR'}
              >
                {user?.rol === 'ROLE_PRECEPTOR' ? (
                  <option value="curso">Por curso</option>
                ) : (
                  <>
                    <option value="todos">Todos los cursos</option>
                    <option value="curso">Por curso</option>
                  </>
                )}
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

      {/* Acordeón con KPIs (se oculta en impresión) */}
      {kpisData && (
        <Accordion className="mb-3 d-print-none">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <BarChart3 size={20} className="me-2" />
              <strong>KPIs y Gráficos de Tardanzas</strong>
            </Accordion.Header>
            <Accordion.Body>
              <Row className="g-3 mb-3">
                <Col sm={12} md={6} lg={3}>
                  <Card className="h-100 border-primary">
                    <Card.Body>
                      <div className="text-primary mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Alumnos</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalAlumnos}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={12} md={6} lg={3}>
                  <Card className="h-100 border-warning">
                    <Card.Body>
                      <div className="text-warning mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Tardanzas</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalTardanzas}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={12} md={6} lg={3}>
                  <Card className="h-100 border-info">
                    <Card.Body>
                      <div className="text-info mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Promedio por Alumno</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.promedioTardanzas}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={12} md={6} lg={3}>
                  <Card className="h-100 border-danger">
                    <Card.Body>
                      <div className="text-danger mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Máximo</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.tardanzaMaxima}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Mínimo: {kpisData.tardanzaMinima}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Gráficos */}
              <Row className="g-3">
                {/* Distribución por rangos */}
                <Col sm={12} lg={6}>
                  <Card className="h-100">
                    <Card.Header><strong>Distribución por Rangos de Tardanzas</strong></Card.Header>
                    <Card.Body>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={kpisData.distribucion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="rango" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" name="Cantidad de alumnos">
                            {kpisData.distribucion.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Top 5 alumnos con más tardanzas */}
                <Col sm={12} lg={6}>
                  <Card className="h-100">
                    <Card.Header><strong>Top 5 Alumnos con Más Tardanzas</strong></Card.Header>
                    <Card.Body>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={kpisData.top5} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="nombre" width={100} />
                          <Tooltip />
                          <Bar dataKey="tardanzas" fill="#fd7e14" name="Tardanzas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Distribución por curso (solo si modo='todos' y hay varios cursos) */}
                {kpisData.mostrarCursos && (
                  <Col sm={12}>
                    <Card>
                      <Card.Header><strong>Tardanzas por Curso</strong></Card.Header>
                      <Card.Body>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={kpisData.cursoData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="curso" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="tardanzas" fill="#17a2b8" name="Total tardanzas" />
                            <Bar dataKey="alumnos" fill="#6c757d" name="Cantidad alumnos" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}

      <div className="row g-2 mb-2 d-print-none">
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
                  <th>DNI</th>
                  <th>Curso</th>
                  <th className="text-end">Tardanzas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-3">Sin datos</td></tr>
                )}
                {items.map((it, idx) => {
                  const alumno = getNombreAlumno(it);
                  const curso = getNombreCurso(it);
                  const cant = getCantidadTardanzas(it);
                  const isExpanded = expandedRows.has(it.alumnoId);
                  const tieneDetalles = Array.isArray(it.detalles) && it.detalles.length > 0;

                  return (
                    <React.Fragment key={idx}>
                      <tr>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {tieneDetalles && (
                              <button 
                                className="btn btn-sm p-0 border-0"
                                onClick={() => toggleRow(it.alumnoId)}
                                title={isExpanded ? 'Contraer' : 'Expandir'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                            <button 
                              className="btn btn-link p-0 text-start" 
                              onClick={() => {
                                navigate(`/alumnos/${it.alumnoId}`);
                              }}
                              disabled={!it.alumnoId}
                              style={{ cursor: !it.alumnoId ? 'not-allowed' : 'pointer' }}
                            >
                              {alumno}
                            </button>
                          </div>
                        </td>
                        <td>{it.dni || '-'}</td>
                        <td>{curso}</td>
                        <td className="text-end"><span className="badge text-bg-warning text-dark">{cant}</span></td>
                        {/* Botón de 'Ver detalle' eliminado, ya que el detalle está en el desplegable */}
                      </tr>
                      {/* Fila expandida con detalle de tardanzas */}
                      {tieneDetalles && isExpanded && (
                        <tr className="table-light">
                          <td colSpan={5}>
                            <div className="p-3">
                              <h6 className="mb-3">
                                <Calendar size={18} className="me-2 mb-1" />
                                Detalle de tardanzas ({it.detalles.length})
                              </h6>
                              <div className="table-responsive">
                                <Table size="sm" className="mb-0" style={{ fontSize: '0.9rem' }}>
                                  <thead className="table-secondary">
                                    <tr>
                                      <th style={{ width: '25%' }}>Fecha</th>
                                      <th>Observación</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {it.detalles.map((detalle, dIdx) => (
                                      <tr key={dIdx}>
                                        <td>
                                          <strong>{formatFecha(detalle.fecha)}</strong>
                                        </td>
                                        <td>
                                          {detalle.observacion ? (
                                            <div className="d-flex align-items-start gap-2">
                                              <AlertCircle size={16} className="text-muted flex-shrink-0 mt-1" />
                                              <span>{detalle.observacion}</span>
                                            </div>
                                          ) : (
                                            <span className="text-muted">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
