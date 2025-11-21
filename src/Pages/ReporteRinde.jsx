import React, { useMemo, useRef, useState } from 'react';
import { Accordion, Card, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarRindenPorCurso } from '../Services/ReporteRindeService';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { exportRindeCSV } from '../utils/exporters';

export default function ReporteRinde() {
  const { user } = useAuth();
  const token = user?.token;

  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  // vista: 'alumno' | 'materia' | 'plano'
  const [vista, setVista] = useState('materia');
  const [materias, setMaterias] = useState([]);
  const [materiaId, setMateriaId] = useState('');
  const [condicion, setCondicion] = useState('TODAS'); // TODAS | COLOQUIO | EXAMEN
  const [busqueda, setBusqueda] = useState(''); // sólo aplica en vista por alumno
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const cs = await listarCursos(token);
        setCursos((cs || []).map(c => ({ value: c.id, label: `${c.anio || ''} ${c.division || ''}`.trim() })));
      } catch (e) {
        console.warn('No se pudieron cargar cursos para Reporte Rinde:', e);
      }
    })();
  }, [token]);

  // Cargar materias del curso seleccionado
  useEffect(() => {
    if (!token || !cursoId) { setMaterias([]); setMateriaId(''); return; }
    (async () => {
      try {
        const ms = await listarMateriasDeCurso(token, Number(cursoId));
        setMaterias((ms || []).map(m => ({ value: m.materiaId ?? m.id, label: m.nombreMateria })));
      } catch (e) {
        console.warn('No se pudieron cargar materias del curso:', e);
        setMaterias([]);
      }
    })();
  }, [token, cursoId]);

  const buscar = async () => {
    if (!cursoId) { toast.info('Seleccioná un curso'); return; }
    try {
      setCargando(true);
      const data = await listarRindenPorCurso(token, { cursoId: Number(cursoId), anio });
      if (data?.code && data.code < 0) throw new Error(data.mensaje || 'Error al obtener reporte');
      setRes(data);
    } catch (e) {
      toast.error(e.message || 'Error al obtener reporte');
    } finally {
      setCargando(false);
    }
  };

  // Nota: los totales dinámicos se calculan directo sobre filasFiltradas y se muestran en badges

  // Aplicar filtros de materia y condición
  const filasFiltradas = useMemo(() => {
    const base = res?.filas || [];
    return base.filter(f => {
      const okMateria = materiaId ? (f.materiaId === Number(materiaId)) : true;
      const okCond = condicion === 'TODAS' ? true : f.condicion === condicion;
      return okMateria && okCond;
    });
  }, [res, materiaId, condicion]);

  // Agrupar filas por alumno para evitar repetidos por materia
  const agrupadosPorAlumno = useMemo(() => {
    const out = new Map();
    (filasFiltradas || []).forEach(f => {
      const key = f.alumnoId ?? f.dni ?? `${f.apellido ?? ''}|${f.nombre ?? ''}`;
      if (!out.has(key)) {
        out.set(key, {
          alumnoId: f.alumnoId,
          dni: f.dni,
          apellido: f.apellido,
          nombre: f.nombre,
          materias: [],
          totalMaterias: 0,
          totalColoquio: 0,
          totalExamen: 0,
        });
      }
      const entry = out.get(key);
      entry.totalMaterias += 1;
      if (f.condicion === 'COLOQUIO') entry.totalColoquio += 1;
      if (f.condicion === 'EXAMEN') entry.totalExamen += 1;
      entry.materias.push({
        id: f.materiaId,
        nombre: f.materiaNombre,
        condicion: f.condicion,
        e1: f.e1, e2: f.e2, pg: f.pg, co: f.co, ex: f.ex, pf: f.pf,
      });
    });
    return Array.from(out.values());
  }, [filasFiltradas]);

  // Aplicar búsqueda (sólo en vista por alumno)
  const agrupadosPorAlumnoFiltrados = useMemo(() => {
    if (!busqueda) return agrupadosPorAlumno;
    const q = busqueda.toLowerCase().trim();
    return agrupadosPorAlumno.filter(a => {
      const nombreComp = `${a.apellido ?? ''} ${a.nombre ?? ''}`.toLowerCase();
      const dniStr = (a.dni ?? '').toString().toLowerCase();
      return nombreComp.includes(q) || dniStr.includes(q);
    });
  }, [agrupadosPorAlumno, busqueda]);

  // Agrupar filas por materia
  const agrupadosPorMateria = useMemo(() => {
    const out = new Map();
    (filasFiltradas || []).forEach(f => {
      const key = f.materiaId ?? f.materiaNombre ?? 'sin-materia';
      if (!out.has(key)) {
        out.set(key, {
          materiaId: f.materiaId,
          materiaNombre: f.materiaNombre,
          alumnos: [], // { alumnoId, apellido, nombre, dni, e1,e2,pg,co,ex,pf, condicion }
        });
      }
      const entry = out.get(key);
      entry.alumnos.push({
        alumnoId: f.alumnoId,
        apellido: f.apellido,
        nombre: f.nombre,
        dni: f.dni,
        e1: f.e1, e2: f.e2, pg: f.pg, co: f.co, ex: f.ex, pf: f.pf,
        condicion: f.condicion,
      });
    });
    return Array.from(out.values());
  }, [filasFiltradas]);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!filasFiltradas || filasFiltradas.length === 0) return null;

    const totalAlumnos = agrupadosPorAlumno.length;
    // Contar materias únicas (no filas)
    const materiasUnicas = new Set(filasFiltradas.map(f => f.materiaId)).size;
    const totalMaterias = materiasUnicas > 0 ? materiasUnicas : filasFiltradas.length;
    const totalColoquio = filasFiltradas.filter(f => f.condicion === 'COLOQUIO').length;
    const totalExamen = filasFiltradas.filter(f => f.condicion === 'EXAMEN').length;
    const promedioMateriasPorAlumno = totalAlumnos > 0 ? (totalMaterias / totalAlumnos).toFixed(1) : 0;

    // Distribución Coloquio vs Examen para pie chart
    const condicionData = [
      { name: 'Coloquio', value: totalColoquio, color: '#ffc107' },
      { name: 'Examen', value: totalExamen, color: '#dc3545' }
    ].filter(d => d.value > 0);

    // Top materias con más alumnos
    const materiasCounts = {};
    filasFiltradas.forEach(f => {
      const key = f.materiaNombre || 'Sin nombre';
      if (!materiasCounts[key]) materiasCounts[key] = 0;
      materiasCounts[key]++;
    });
    const topMaterias = Object.entries(materiasCounts)
      .map(([materia, count]) => ({ materia: materia.substring(0, 30), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribución por cantidad de materias que rinde cada alumno
    const distribucionMaterias = [
      { rango: '1 materia', count: 0 },
      { rango: '2 materias', count: 0 },
      { rango: '3 materias', count: 0 },
      { rango: '4 materias', count: 0 },
      { rango: '5+ materias', count: 0 }
    ];
    agrupadosPorAlumno.forEach(a => {
      const cant = a.totalMaterias;
      if (cant === 1) distribucionMaterias[0].count++;
      else if (cant === 2) distribucionMaterias[1].count++;
      else if (cant === 3) distribucionMaterias[2].count++;
      else if (cant === 4) distribucionMaterias[3].count++;
      else if (cant >= 5) distribucionMaterias[4].count++;
    });

    // Top alumnos con más materias
    const topAlumnos = [...agrupadosPorAlumno]
      .sort((a, b) => b.totalMaterias - a.totalMaterias)
      .slice(0, 10)
      .map(a => ({
        nombre: `${a.apellido || ''} ${a.nombre || ''}`.trim().substring(0, 25),
        materias: a.totalMaterias
      }));

    return {
      totalAlumnos,
      totalMaterias,
      totalColoquio,
      totalExamen,
      promedioMateriasPorAlumno,
      porcentajeColoquio: totalMaterias > 0 ? ((totalColoquio / totalMaterias) * 100).toFixed(1) : 0,
      porcentajeExamen: totalMaterias > 0 ? ((totalExamen / totalMaterias) * 100).toFixed(1) : 0,
      condicionData,
      topMaterias,
      distribucionMaterias,
      topAlumnos
    };
  }, [filasFiltradas, agrupadosPorAlumno]);

  const cursoLabel = useMemo(() => {
    const opt = cursos.find(c => String(c.value) === String(cursoId));
    return opt?.label || '';
  }, [cursos, cursoId]);

  const materiaLabel = useMemo(() => {
    const opt = materias.find(m => String(m.value) === String(materiaId));
    return opt?.label || '';
  }, [materias, materiaId]);

  const onExportCSV = () => {
    try {
      exportRindeCSV({
        vista,
        filas: filasFiltradas,
        gruposAlumno: agrupadosPorAlumnoFiltrados,
        filename: (() => {
          const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
          const meta = [
            slug(cursoLabel || ''),
            anio,
            materiaId ? slug(materiaLabel) : 'todas',
            condicion && condicion !== 'TODAS' ? slug(condicion) : 'todas',
            slug(vista),
          ].filter(Boolean).join('_');
          return `reporte_rinden_${meta}.csv`;
        })(),
      });
    } catch {
      toast.error('No se pudo exportar CSV');
    }
  };

  const imprimirPDF = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      @page { size: landscape; margin: 18mm; }
      body { font-family: Arial, sans-serif; padding: 0 8px; }
      h3 { margin: 0 0 8px 0; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      .kpi-section { margin: 0 0 16px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
      .kpi-card { padding: 8px; border: 1px solid #ccc; background: #fff; }
      .kpi-label { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; }
      .kpi-value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
      .table-responsive { overflow: visible !important; }
      hr { border: 0; border-top: 1px solid #ccc; margin: 10px 0; }
    `;
    const meta = [
      cursoLabel ? `Curso: ${cursoLabel}` : null,
      anio ? `Año: ${anio}` : null,
      materiaLabel ? `Materia: ${materiaLabel}` : null,
      condicion && condicion !== 'TODAS' ? `Condición: ${condicion}` : null,
    ].filter(Boolean).join('  |  ');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Alumnos que rinden</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Alumnos que rinden (Dic/Feb)</h3>`);
    if (meta) win.document.write(`<div class="sub">${meta}</div>`);
    
    // KPIs en PDF
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Materias</div><div class="kpi-value">${kpisData.totalMaterias}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio por Alumno</div><div class="kpi-value">${kpisData.promedioMateriasPorAlumno}</div><div style="font-size:10px;color:#666;">materias/alumno</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Coloquio / Examen</div><div class="kpi-value">${kpisData.totalColoquio} / ${kpisData.totalExamen}</div><div style="font-size:10px;color:#666;">${kpisData.porcentajeColoquio}% / ${kpisData.porcentajeExamen}%</div></div>`);
      win.document.write(`</div></div>`);
    }
    
    win.document.write(`<div>${printRef.current.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton /></div>
      <div className="d-flex align-items-center justify-content-center mb-2">
        <h2 className="m-0 text-center">Alumnos que rinden (Dic/Feb)</h2>
      </div>
      <p className="text-muted text-center mb-3">
        Este reporte muestra los alumnos que deben rendir materias en las mesas de examen de diciembre y febrero, indicando la condición en la que rinden (coloquio o examen final).
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-4">
              <label className="form-label">Curso</label>
              <select className="form-select" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                <option value="">Seleccione</option>
                {cursos.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Materia (opcional)</label>
              <select className="form-select" value={materiaId} onChange={(e) => setMateriaId(e.target.value)} disabled={!materias.length}>
                <option value="">Todas</option>
                {materias.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Año</label>
              <div className="d-flex gap-2">
                <input type="number" className="form-control" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
                <button className="btn btn-primary" onClick={buscar} disabled={cargando}>{cargando ? 'Buscando...' : 'Buscar'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {res && (
        <>
          {/* Acordeón con KPIs (se oculta en impresión) */}
          {kpisData && (
            <Accordion className="mb-3 d-print-none">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BarChart3 size={20} className="me-2" />
                  <strong>KPIs y Gráficos - Alumnos que Rinden</strong>
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
                          <div className="text-warning mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Materias</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalMaterias}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-secondary">
                        <Card.Body>
                          <div className="text-secondary mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Coloquio / Examen</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span className="text-warning">{kpisData.totalColoquio}</span>
                            {' / '}
                            <span className="text-danger">{kpisData.totalExamen}</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{kpisData.porcentajeColoquio}% / {kpisData.porcentajeExamen}%</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Gráficos */}
                  <Row className="g-3">
                    {/* Distribución Coloquio vs Examen */}
                    {kpisData.condicionData.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Condición: Coloquio vs Examen</strong></Card.Header>
                          <Card.Body>
                            <p className="text-muted small mb-3"><em>Nota: Representa la cantidad de evaluaciones (coloquios y exámenes finales) a rendir. Algunos alumnos pueden tener múltiples evaluaciones, por lo que el total puede ser mayor que la cantidad de alumnos únicos.</em></p>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={kpisData.condicionData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                >
                                  {kpisData.condicionData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}

                    {/* Distribución por cantidad de materias */}
                    <Col sm={12} lg={6}>
                      <Card className="h-100">
                        <Card.Header><strong>Distribución por Cantidad de Materias</strong></Card.Header>
                        <Card.Body>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={kpisData.distribucionMaterias}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="rango" angle={-15} textAnchor="end" height={80} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#17a2b8" name="Cantidad de alumnos" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Top materias con más alumnos */}
                    {kpisData.topMaterias.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Top Materias con Más Alumnos</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={Math.max(300, kpisData.topMaterias.length * 35)}>
                              <BarChart data={kpisData.topMaterias} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="materia" width={120} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#fd7e14" name="Alumnos" />
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

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 mb-3 d-print-none">
            <div className="d-flex flex-wrap gap-2">
              <span className="badge text-bg-secondary">Total filas: {filasFiltradas.length}</span>
              <span className="badge text-bg-info text-dark">Alumnos únicos: {vista === 'alumno' ? agrupadosPorAlumnoFiltrados.length : agrupadosPorAlumno.length}</span>
              <span className="badge text-bg-warning text-dark">Coloquio: {filasFiltradas.filter(f => f.condicion === 'COLOQUIO').length}</span>
              <span className="badge text-bg-danger">Examen: {filasFiltradas.filter(f => f.condicion === 'EXAMEN').length}</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-success" type="button" onClick={onExportCSV}>Exportar CSV</button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={imprimirPDF}>Imprimir / PDF</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="row align-items-center g-2">
                <div className="col-12 col-md-4 d-flex align-items-center gap-2">
                  <strong>Resultados</strong>
                  {vista === 'alumno' && (
                    <>
                      <span className="vr mx-1 d-none d-md-inline" />
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Buscar nombre o DNI"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                      />
                    </>
                  )}
                </div>
                <div className="col-12 col-md-4 d-flex justify-content-center">
                  <div className="d-flex align-items-center gap-2">
                    <label className="form-label m-0 small">Vista</label>
                    <select className="form-select form-select-sm" style={{width: 180}} value={vista} onChange={(e) => setVista(e.target.value)}>
                      <option value="alumno">Por alumno</option>
                      <option value="materia">Por materia</option>
                      <option value="plano">Tabla plana</option>
                    </select>
                  </div>
                </div>
                <div className="col-12 col-md-4 d-flex justify-content-md-end">
                  <div className="d-flex align-items-center gap-2 w-100 justify-content-between justify-content-md-end flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <label className="form-label m-0 small">Condición</label>
                      <select className="form-select form-select-sm" style={{width: 160}} value={condicion} onChange={(e) => setCondicion(e.target.value)}>
                        <option value="TODAS">Todas</option>
                        <option value="COLOQUIO">Solo coloquio</option>
                        <option value="EXAMEN">Solo examen</option>
                      </select>
                    </div>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => { setCondicion('TODAS'); setBusqueda(''); }}
                    >
                      Limpiar filtros
                    </button>
                    {/* acciones de exportación se moverán debajo para no deformar el header */}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body p-0" ref={printRef}>
              <div className="table-responsive">
                {vista === 'alumno' ? (
                  <div className="p-3">
                    {agrupadosPorAlumnoFiltrados.length ? agrupadosPorAlumnoFiltrados.map((a, idx) => (
                      <div key={idx} className="mb-4">
                        <h6 className="mb-2">Alumno: <span className="fw-semibold">{`${a.apellido ?? ''} ${a.nombre ?? ''}`.trim()}</span> {a.dni ? `(DNI ${a.dni})` : ''}</h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Materia</th>
                                <th className="text-end">E1</th>
                                <th className="text-end">E2</th>
                                <th className="text-end">PG</th>
                                <th className="text-end">CO</th>
                                <th className="text-end">EX</th>
                                <th>Condición</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.materias.length ? a.materias.map((m, j) => (
                                <tr key={j}>
                                  <td>{m.nombre ?? '-'}</td>
                                  <td className="text-end">{m.e1 ?? '-'}</td>
                                  <td className="text-end">{m.e2 ?? '-'}</td>
                                  <td className="text-end">{m.pg ?? '-'}</td>
                                  <td className="text-end">{m.co ?? '-'}</td>
                                  <td className="text-end">{m.ex ?? '-'}</td>
                                  <td>{m.condicion ?? '-'}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={7} className="text-center text-muted py-2">Sin materias</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <hr className="mt-0" />
                      </div>
                    )) : (
                      <div className="text-center text-muted py-3">Sin datos</div>
                    )}
                  </div>
                ) : vista === 'plano' ? (
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th>Materia</th>
                        <th className="text-end">E1</th>
                        <th className="text-end">E2</th>
                        <th className="text-end">PG</th>
                        <th className="text-end">CO</th>
                        <th className="text-end">EX</th>
                        <th className="text-end">PFA</th>
                        <th>Condición</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filasFiltradas?.length ? filasFiltradas.map((f, idx) => (
                        <tr key={idx}>
                          <td>{`${f.apellido ?? ''} ${f.nombre ?? ''}`.trim()}</td>
                          <td>{f.dni ?? '-'}</td>
                          <td>{f.materiaNombre ?? '-'}</td>
                          <td className="text-end">{f.e1 ?? '-'}</td>
                          <td className="text-end">{f.e2 ?? '-'}</td>
                          <td className="text-end">{f.pg ?? '-'}</td>
                          <td className="text-end">{f.co ?? '-'}</td>
                          <td className="text-end">{f.ex ?? '-'}</td>
                          <td className="text-end">{f.pf ?? '-'}</td>
                          <td>{f.condicion ?? '-'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={10} className="text-center text-muted py-3">Sin datos</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  // vista === 'materia'
                  <div className="p-3">
                    {agrupadosPorMateria.length ? agrupadosPorMateria.map((m, idx) => (
                      <div key={idx} className="mb-4">
                        <h6 className="mb-2">Materia: <span className="fw-semibold">{m.materiaNombre ?? '-'}</span></h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Alumno</th>
                                <th>DNI</th>
                                <th className="text-end">E1</th>
                                <th className="text-end">E2</th>
                                <th className="text-end">PG</th>
                                <th className="text-end">CO</th>
                                <th className="text-end">EX</th>
                                <th className="text-end">PFA</th>
                                <th>Condición</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.alumnos.length ? m.alumnos.map((a, j) => (
                                <tr key={j}>
                                  <td>{`${a.apellido ?? ''} ${a.nombre ?? ''}`.trim()}</td>
                                  <td>{a.dni ?? '-'}</td>
                                  <td className="text-end">{a.e1 ?? '-'}</td>
                                  <td className="text-end">{a.e2 ?? '-'}</td>
                                  <td className="text-end">{a.pg ?? '-'}</td>
                                  <td className="text-end">{a.co ?? '-'}</td>
                                  <td className="text-end">{a.ex ?? '-'}</td>
                                  <td className="text-end">{a.pf ?? '-'}</td>
                                  <td>{a.condicion ?? '-'}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={9} className="text-center text-muted py-2">Sin alumnos</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted py-3">Sin datos</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
