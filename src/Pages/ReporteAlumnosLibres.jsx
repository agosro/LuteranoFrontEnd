
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Accordion } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { useOpenedInNewTab } from '../Context/useOpenedInNewTab';
import { listarCursos, listarCursosPorPreceptor } from '../Services/CursoService';
import { fetchAlumnosLibres } from '../Services/ReporteAlumnosLibresService';
import { toast } from 'react-toastify';

export default function ReporteAlumnosLibres() {
  const { user } = useAuth();
  const isNewTab = useOpenedInNewTab();
  const token = user?.token;

  const [modo, setModo] = useState(user?.rol === 'ROLE_PRECEPTOR' ? 'curso' : 'todos'); // 'todos' | 'curso'
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
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
        console.warn('No se pudieron cargar cursos para filtros de libres:', e);
      }
    })();
  }, [token, user]);

  const aniosPosibles = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map(String);
  }, []);

  const fetchReporte = async () => {
    try {
      setCargando(true);
      const cursoParam = (modo === 'curso' && cursoId) ? Number(cursoId) : null;
      const res = await fetchAlumnosLibres(Number(anio), cursoParam, token);
      const lista = Array.isArray(res?.filas) ? res.filas : [];
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
    return arr;
  }, [items]);

  const totalFilas = displayedItems.length;
  const promedioInasist = useMemo(() => {
    if (!items || items.length === 0) return 0;
    const s = items.reduce((acc, it) => acc + (Number(it?.inasistenciasAcum) || 0), 0);
    return Math.round((s / items.length) * 10) / 10;
  }, [items]);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!items || items.length === 0) return null;

    const inasistencias = items.map(it => Number(it?.inasistenciasAcum) || 0);
    const totalAlumnos = items.length;
    const inasistenciaMinima = Math.min(...inasistencias);
    const inasistenciaMaxima = Math.max(...inasistencias);

    // Distribución por rangos de inasistencias
    const distribucion = [
      { rango: '0-10', count: 0, color: '#28a745' },
      { rango: '11-15', count: 0, color: '#17a2b8' },
      { rango: '16-20', count: 0, color: '#ffc107' },
      { rango: '21-25', count: 0, color: '#fd7e14' },
      { rango: '26+', count: 0, color: '#dc3545' }
    ];

    inasistencias.forEach(inas => {
      if (inas >= 0 && inas <= 10) distribucion[0].count++;
      else if (inas >= 11 && inas <= 15) distribucion[1].count++;
      else if (inas >= 16 && inas <= 20) distribucion[2].count++;
      else if (inas >= 21 && inas <= 25) distribucion[3].count++;
      else if (inas >= 26) distribucion[4].count++;
    });

    // Distribución por motivo
    const motivoCounts = {};
    items.forEach(it => {
      const motivo = it?.motivo || 'Sin motivo';
      motivoCounts[motivo] = (motivoCounts[motivo] || 0) + 1;
    });

    const motivoData = Object.entries(motivoCounts).map(([motivo, count]) => ({
      name: motivo,
      value: count
    })).sort((a, b) => b.value - a.value);

    // Colores para motivos
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#17a2b8', '#28a745', '#6610f2', '#e83e8c'];

    // Top 5 alumnos con más inasistencias
    const top5 = [...items]
      .sort((a, b) => (Number(b?.inasistenciasAcum) || 0) - (Number(a?.inasistenciasAcum) || 0))
      .slice(0, 5)
      .map(it => ({
        nombre: `${(it?.apellido || '').trim().substring(0, 15)} ${(it?.nombre || '').trim().substring(0, 1)}.`.trim(),
        inasistencias: Number(it?.inasistenciasAcum) || 0
      }));

    return {
      totalAlumnos,
      promedioInasist,
      inasistenciaMinima,
      inasistenciaMaxima,
      distribucion,
      motivoData: motivoData.map((m, idx) => ({ ...m, color: colors[idx % colors.length] })),
      top5
    };
  }, [items, promedioInasist]);

  const exportCSV = () => {
    if (!displayedItems || displayedItems.length === 0) return;
    const header = ["Alumno", "DNI", "Curso", "Inasistencias"];
    const rows = displayedItems.map(it => {
      const anio = it?.anio ?? '';
      const division = it?.division ?? '';
      const cursoFormat = `${anio}°${division}`;
      return [
        `${(it?.apellido || '').trim()} ${(it?.nombre || '').trim()}`.trim(),
        it?.dni ?? '',
        cursoFormat,
        it?.inasistenciasAcum ?? ''
      ];
    });
    const csv = [header, ...rows]
      .map(cols => cols.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cursoLbl = modo === 'curso' ? (cursos.find(c=>String(c.value)===String(cursoId))?.label || String(cursoId||'')) : 'todos';
    const cursoSlug = cursoLbl.replace(/\s+/g, '_');
    a.download = `reporte_alumnos_libres_${cursoSlug}_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printOnlyTable = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 20px; 
        color: #212529;
      }
      h3 { 
        margin: 0 0 8px 0; 
        font-size: 20px;
        font-weight: 600;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        padding-bottom: 6px;
      }
      .sub { 
        margin: 0 0 16px 0; 
        color: #6c757d; 
        font-size: 12px; 
      }
      .kpi-section {
        background: #f8f9fa;
        padding: 14px;
        border-radius: 6px;
        margin-bottom: 16px;
        border: 1px solid #dee2e6;
      }
      .kpi-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #495057;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }
      .kpi-card {
        background: white;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        text-align: center;
      }
      .kpi-label {
        font-size: 10px;
        color: #6c757d;
        margin-bottom: 3px;
      }
      .kpi-value {
        font-size: 16px;
        font-weight: 600;
        color: #212529;
      }
      .kpi-distribution {
        font-size: 11px;
        line-height: 1.6;
        color: #495057;
      }
      .kpi-dist-item {
        display: flex;
        justify-content: space-between;
        padding: 3px 6px;
        background: white;
        border-radius: 3px;
        margin-bottom: 3px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 11px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 6px 8px; 
      }
      thead tr:first-child th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      @media print {
        body { padding: 12px; }
        .kpi-section { page-break-inside: avoid; }
      }
    `;
    const titulo = modo === 'curso' ? `Alumnos Libres · Curso ${cursos.find(c=>String(c.value)===String(cursoId))?.label || ''}` : 'Alumnos Libres · Todos los cursos';
    const sub = `Año: ${anio}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Alumnos Libres</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(`<div class="sub">${sub}</div>`);
    
    // KPIs en formato texto
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Resumen Estadístico</div>`);
      
      // Métricas principales
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos Libres</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio Inasistencias</div><div class="kpi-value">${kpisData.promedioInasist}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Máxima Inasistencias</div><div class="kpi-value">${kpisData.inasistenciaMaxima}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Mínima Inasistencias</div><div class="kpi-value">${kpisData.inasistenciaMinima}</div></div>`);
      win.document.write(`</div>`);
      
      // Distribución
      win.document.write(`<div class="kpi-distribution">`);
      win.document.write(`<strong>Distribución de Inasistencias:</strong><br>`);
      kpisData.distribucion.forEach(d => {
        win.document.write(`<div class="kpi-dist-item"><span>Rango ${d.rango}:</span><span><strong>${d.count}</strong> alumnos</span></div>`);
      });
      win.document.write(`</div>`);
      
      win.document.write(`</div>`);
    }
    
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton hidden={isNewTab} /></div>
      <div className="d-flex align-items-center justify-content-center mb-3">
        <h2 className="m-0 text-center">Reporte de Alumnos Libres por Inasistencias</h2>
      </div>
      <p className="text-muted mb-3 text-center">
        Este reporte lista alumnos que han perdido su condición de regularidad por haber superado el límite de 25 inasistencias. 
        Muestra la cantidad total acumulada de inasistencias en el año calendario seleccionado para facilitar el seguimiento administrativo.
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
              <label className="form-label">Año</label>
              <select className="form-select" value={anio} onChange={(e) => setAnio(e.target.value)}>
                {aniosPosibles.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
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
        <div className="col-auto"><span className="badge text-bg-secondary">Total alumnos libres: {items.length}</span></div>
        <div className="col-auto"><span className="badge text-bg-info">Mostrando: {totalFilas}</span></div>
      </div>

      {/* KPIs y Gráficos desplegables */}
      {kpisData && (
        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <BarChart3 size={18} className="me-2" />
              <strong>Análisis Detallado y Gráficos</strong>
            </Accordion.Header>
            <Accordion.Body>
              {/* KPIs en Cards */}
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Card className="h-100 border-danger">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Total Alumnos Libres</div>
                      <div className="h2 mb-0 text-danger">{kpisData.totalAlumnos}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-danger">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Máxima Inasistencias</div>
                      <div className="h2 mb-0 text-danger">{kpisData.inasistenciaMaxima}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-success">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Mínima Inasistencias</div>
                      <div className="h2 mb-0 text-success">{kpisData.inasistenciaMinima}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Gráficos */}
              <Row className="g-3">
                <Col md={7}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Distribución de Inasistencias</h6>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={kpisData.distribucion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="rango" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Cantidad de alumnos" fill="#0066cc">
                            {kpisData.distribucion.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}

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
                  <th className="text-end">Inasistencias</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-3">Sin datos</td></tr>
                )}
                {items.map((it, idx) => {
                  const alumno = `${(it?.apellido || '').trim()} ${(it?.nombre || '').trim()}`.trim() || '-';
                  const anio = it?.anio ?? '';
                  const division = it?.division ?? '';
                  const cursoFormat = `${anio}°${division}`;
                  const cant = it?.inasistenciasAcum ?? 0;
                  return (
                    <tr key={idx}>
                      <td>{alumno}</td>
                      <td>{it?.dni ?? ''}</td>
                      <td>{cursoFormat}</td>
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
