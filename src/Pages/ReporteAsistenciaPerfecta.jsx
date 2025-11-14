import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Form, Row, Col, Spinner, Alert, Table, Badge, Accordion, ButtonGroup } from "react-bootstrap";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, FileText, GraduationCap } from 'lucide-react';
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";
import { obtenerAsistenciaPerfecta } from "../Services/ReporteAsistenciaPerfectaService";
import { listarCursos } from "../Services/CursoService";
import { useNavigate } from "react-router-dom";

export default function ReporteAsistenciaPerfecta() {
  const { user } = useAuth();
  const token = user?.token;
  const navigate = useNavigate();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [modo, setModo] = useState('todos'); // 'todos' | 'curso' | 'top'
  const [soloConPerfectos, setSoloConPerfectos] = useState(true); // aplica a 'todos'
  const [topNPorCurso, setTopNPorCurso] = useState('todos'); // 'todos' | '3' | '5' | '10'
  const [cursosOpts, setCursosOpts] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null); // AsistenciaPerfectaResponse
  const printRef = useRef(null);

  const aniosPosibles = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  // Cargar cursos para filtro por curso
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const lista = await listarCursos(token);
        if (active) setCursosOpts((lista || []).map(c => ({ value: String(c.id), label: `${c.anio || ''} ${c.division || ''}`.trim(), raw: c })));
      } catch {
        // noop
      }
    })();
    return () => { active = false; };
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    try {
      setLoading(true);
      const res = await obtenerAsistenciaPerfecta(token, anio);
      setData(res);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const cursos = useMemo(() => Array.isArray(data?.cursos) ? data.cursos : [], [data]);
  const cursosFiltradosTodos = useMemo(() => {
    const arr = cursos || [];
    return soloConPerfectos ? arr.filter(c => (c?.totalPerfectos || 0) > 0) : arr;
  }, [cursos, soloConPerfectos]);

  const alumnosTodos = useMemo(() => {
    // flatten alumnos con curso al lado
    const out = [];
    (cursosFiltradosTodos || []).forEach(row => {
      const curso = row?.curso || {};
      const etiqueta = `${curso?.anio || ''} ${curso?.division || ''}`.trim();
      let alumnosCurso = row?.alumnos || [];
      
      // Aplicar filtro Top N por curso si está configurado
      if (topNPorCurso !== 'todos') {
        const topN = Number(topNPorCurso);
        alumnosCurso = alumnosCurso.slice(0, topN);
      }
      
      alumnosCurso.forEach(a => {
        out.push({
          id: a?.id,
          alumnoId: a?.alumnoId || a?.id,
          nombre: `${a?.apellido || ''}, ${a?.nombre || ''}`.trim(),
          dni: a?.dni || '',
          cursoEtiqueta: etiqueta,
          cursoId: curso?.id,
          nivel: curso?.nivel || ''
        });
      });
    });
    // ordenar por curso y apellido
    out.sort((x,y) => (x.cursoEtiqueta||'').localeCompare(y.cursoEtiqueta||'') || (x.nombre||'').localeCompare(y.nombre||''));
    return out;
  }, [cursosFiltradosTodos, topNPorCurso]);

  const alumnosCurso = useMemo(() => {
    if (!cursoId) return [];
    const row = (cursos || []).find(r => String(r?.curso?.id || '') === String(cursoId));
    const curso = row?.curso || {};
    const etiqueta = `${curso?.anio || ''} ${curso?.division || ''}`.trim();
    const lista = (row?.alumnos || []).map(a => ({
      id: a?.id,
      alumnoId: a?.alumnoId || a?.id,
      nombre: `${a?.apellido || ''}, ${a?.nombre || ''}`.trim(),
      dni: a?.dni || '',
      cursoEtiqueta: etiqueta,
      cursoId: curso?.id,
      nivel: curso?.nivel || ''
    }));
    lista.sort((x,y) => (x.nombre||'').localeCompare(y.nombre||''));
    return lista;
  }, [cursos, cursoId]);

  const cursosTop = useMemo(() => {
    const arr = [...(cursos || [])];
    arr.sort((a,b) => (b?.totalPerfectos||0) - (a?.totalPerfectos||0));
    return limit ? arr.slice(0, Number(limit)) : arr;
  }, [cursos, limit]);

  const totalPerfectos = data?.totalAlumnosPerfectos ?? (cursos || []).reduce((acc, c) => acc + (c?.totalPerfectos || 0), 0);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!cursos || cursos.length === 0) return null;

    const totalCursos = cursos.length;
    const cursosConPerfectos = cursos.filter(c => (c?.totalPerfectos || 0) > 0).length;
    const cursosSinPerfectos = totalCursos - cursosConPerfectos;
    const promedioPerfectosPorCurso = totalCursos > 0 ? (totalPerfectos / totalCursos).toFixed(1) : 0;

    // Datos específicos para modo "Por Curso"
    let cursoSeleccionado = null;
    let comparacionCurso = null;
    if (modo === 'curso' && cursoId) {
      const cursoData = cursos.find(c => String(c?.curso?.id) === String(cursoId));
      if (cursoData) {
        const perfectosCurso = cursoData.totalPerfectos || 0;
        const promedio = Number(promedioPerfectosPorCurso);
        const posicion = [...cursos]
          .sort((a, b) => (b?.totalPerfectos || 0) - (a?.totalPerfectos || 0))
          .findIndex(c => String(c?.curso?.id) === String(cursoId)) + 1;
        
        cursoSeleccionado = {
          nombre: `${cursoData.curso?.anio || ''} ${cursoData.curso?.division || ''}`.trim(),
          perfectos: perfectosCurso,
          posicion,
          totalCursos
        };
        
        comparacionCurso = [
          { categoria: 'Este Curso', valor: perfectosCurso },
          { categoria: 'Promedio Institucional', valor: promedio }
        ];
      }
    }

    // Distribución por curso (1°, 2°, 3°, etc.) para modo Todos
    const cursosData = {};
    if (modo === 'todos') {
      cursos.forEach(row => {
        const anioCurso = row?.curso?.anio || 'Sin año';
        if (!cursosData[anioCurso]) cursosData[anioCurso] = 0;
        cursosData[anioCurso] += row?.totalPerfectos || 0;
      });
    }
    const distribucionPorCurso = Object.entries(cursosData)
      .map(([anio, total]) => ({ anio, total }))
      .sort((a, b) => String(a.anio).localeCompare(String(b.anio)));

    // Top 10 cursos con más alumnos perfectos
    const topCursos = [...cursos]
      .sort((a, b) => (b?.totalPerfectos || 0) - (a?.totalPerfectos || 0))
      .slice(0, 10)
      .map(row => ({
        curso: `${row?.curso?.anio ?? ''} ${row?.curso?.division ?? ''}`.trim(),
        perfectos: row?.totalPerfectos || 0
      }));

    // Distribución por niveles
    const niveles = {};
    cursos.forEach(row => {
      const nivel = row?.curso?.nivel || 'Sin nivel';
      if (!niveles[nivel]) niveles[nivel] = { total: 0, perfectos: 0 };
      niveles[nivel].total += 1;
      niveles[nivel].perfectos += row?.totalPerfectos || 0;
    });
    const nivelesData = Object.entries(niveles).map(([nivel, data]) => ({
      nivel,
      perfectos: data.perfectos,
      promedio: (data.perfectos / data.total).toFixed(1)
    }));

    // Distribución: cursos con/sin perfectos
    const distribucionData = [
      { name: 'Con perfectos', value: cursosConPerfectos, color: '#28a745' },
      { name: 'Sin perfectos', value: cursosSinPerfectos, color: '#6c757d' }
    ].filter(d => d.value > 0);

    // Distribución por rangos de perfectos
    const rangosData = [
      { rango: '0', count: 0, color: '#6c757d' },
      { rango: '1-2', count: 0, color: '#ffc107' },
      { rango: '3-5', count: 0, color: '#17a2b8' },
      { rango: '6-10', count: 0, color: '#28a745' },
      { rango: '11+', count: 0, color: '#007bff' }
    ];
    cursos.forEach(row => {
      const count = row?.totalPerfectos || 0;
      if (count === 0) rangosData[0].count++;
      else if (count >= 1 && count <= 2) rangosData[1].count++;
      else if (count >= 3 && count <= 5) rangosData[2].count++;
      else if (count >= 6 && count <= 10) rangosData[3].count++;
      else if (count >= 11) rangosData[4].count++;
    });

    return {
      totalPerfectos,
      totalCursos,
      cursosConPerfectos,
      promedioPerfectosPorCurso,
      topCursos,
      nivelesData,
      distribucionData,
      rangosData,
      cursoSeleccionado,
      comparacionCurso,
      distribucionPorCurso
    };
  }, [cursos, totalPerfectos, modo, cursoId]);

  const exportCSV = () => {
    const lines = [];
    lines.push(["Año", data?.anio ?? anio]);
    lines.push(["Total alumnos con asistencia perfecta", totalPerfectos]);
    lines.push([]);
    if (modo === 'top') {
      lines.push(["Curso Año", "División", "Nivel", "Perfectos"]);
      (cursosTop || []).forEach(row => {
        lines.push([row?.curso?.anio ?? "", row?.curso?.division ?? "", row?.curso?.nivel ?? "", row?.totalPerfectos ?? 0]);
      });
    } else {
      lines.push(["Alumno", "DNI", "Curso Año", "División", "Nivel"]);
      const fuente = modo === 'curso' ? alumnosCurso : alumnosTodos;
      (fuente || []).forEach(a => {
        lines.push([a?.nombre ?? '', a?.dni ?? '', a?.cursoEtiqueta ?? '', (a?.cursoEtiqueta?.split(' ')||[])[1] || '', a?.nivel ?? '']);
      });
    }
    const csv = lines
      .map(cols => (Array.isArray(cols) ? cols : [cols])
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(','))
      .join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_asistencia_perfecta_${data?.anio ?? anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printAll = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      .kpi-section { margin: 0 0 16px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .kpi-card { padding: 8px; border: 1px solid #ccc; background: #fff; }
      .kpi-label { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; }
      .kpi-value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
      .card { border: 1px solid #ddd; margin-bottom: 12px; }
      .card-header { background: #f7f7f7; padding: 6px 8px; font-weight: 600; }
      .card-body { padding: 8px; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Asistencia Perfecta</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Asistencia Perfecta - Año ${data?.anio ?? anio}</h3>`);
    
    // KPIs en PDF
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Perfectos</div><div class="kpi-value">${kpisData.totalPerfectos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Cursos</div><div class="kpi-value">${kpisData.totalCursos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Cursos con Perfectos</div><div class="kpi-value">${kpisData.cursosConPerfectos}</div><div style="font-size:10px;color:#666;">${kpisData.totalCursos > 0 ? ((kpisData.cursosConPerfectos / kpisData.totalCursos) * 100).toFixed(1) : 0}%</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio por Curso</div><div class="kpi-value">${kpisData.promedioPerfectosPorCurso}</div><div style="font-size:10px;color:#666;">alumnos/curso</div></div>`);
      win.document.write(`</div></div>`);
    }
    
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-3">Alumnos con Asistencia Perfecta</h2>
      
      <p className="text-muted small mb-3">
        Este reporte lista los alumnos que no registran inasistencias ni tardanzas durante el año seleccionado. 
        Podés ver el listado completo, filtrar por curso específico o consultar el ranking de cursos con más alumnos de asistencia perfecta.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>Modo</Form.Label>
                <Form.Select value={modo} onChange={(e) => setModo(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="curso">Por curso</option>
                  <option value="top">Top cursos</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Año</Form.Label>
                <Form.Select value={anio} onChange={(e) => setAnio(e.target.value)}>
                  {aniosPosibles.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Form.Select>
              </Col>
              {modo === 'curso' && (
                <Col md={3}>
                  <Form.Label>Curso</Form.Label>
                  <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                    <option value="">Seleccione</option>
                    {cursosOpts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Form.Select>
                </Col>
              )}
              {modo === 'top' && (
                <Col md={2}>
                  <Form.Label>Top N cursos</Form.Label>
                  <Form.Control type="number" min={1} value={limit} onChange={(e)=>setLimit(Number(e.target.value))} />
                </Col>
              )}
              {modo === 'todos' && (
                <>
                  <Col md={3}>
                    <Form.Label>Limitar por curso</Form.Label>
                    <Form.Select value={topNPorCurso} onChange={(e) => setTopNPorCurso(e.target.value)}>
                      <option value="todos">Todos los alumnos</option>
                      <option value="3">Top 3 por curso</option>
                      <option value="5">Top 5 por curso</option>
                      <option value="10">Top 10 por curso</option>
                    </Form.Select>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Form.Check
                      type="switch"
                      id="soloPerfectosSwitch"
                      label="Solo cursos con perfectos"
                      checked={soloConPerfectos}
                      onChange={(e) => setSoloConPerfectos(e.target.checked)}
                    />
                  </Col>
                </>
              )}
              <Col md={3} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? (<><Spinner size="sm" animation="border" className="me-2" /> Generando...</>) : "Generar reporte"}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && data && !error && (
        <>
          {/* Acordeón con KPIs (se oculta en impresión) */}
          {kpisData && (modo !== 'todos' || topNPorCurso === 'todos') && (
            <Accordion className="mb-3 d-print-none">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BarChart3 size={20} className="me-2" />
                  <strong>KPIs y Gráficos - Asistencia Perfecta</strong>
                </Accordion.Header>
                <Accordion.Body>
                  <Row className="g-3 mb-3">
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-success">
                        <Card.Body>
                          <div className="text-success mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Perfectos</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalPerfectos}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-primary">
                        <Card.Body>
                          <div className="text-primary mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Cursos</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalCursos}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-info">
                        <Card.Body>
                          <div className="text-info mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cursos con Perfectos</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.cursosConPerfectos}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{kpisData.totalCursos > 0 ? ((kpisData.cursosConPerfectos / kpisData.totalCursos) * 100).toFixed(1) : 0}%</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-warning">
                        <Card.Body>
                          <div className="text-warning mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Promedio por Curso</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.promedioPerfectosPorCurso}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>alumnos/curso</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Gráficos contextuales según modo */}
                  <Row className="g-3">
                    {/* Comparación Curso Seleccionado vs Promedio - Solo en modo "Por Curso" */}
                    {modo === 'curso' && kpisData.comparacionCurso && (
                      <>
                        <Col sm={12}>
                          <Alert variant="info" className="mb-3">
                            <strong>{kpisData.cursoSeleccionado.nombre}</strong> tiene <strong>{kpisData.cursoSeleccionado.perfectos}</strong> alumno(s) con asistencia perfecta.
                            Posición en ranking: <strong>#{kpisData.cursoSeleccionado.posicion}</strong> de {kpisData.cursoSeleccionado.totalCursos} cursos.
                          </Alert>
                        </Col>
                        <Col sm={12} lg={6}>
                          <Card className="h-100">
                            <Card.Header><strong>Comparación con Promedio Institucional</strong></Card.Header>
                            <Card.Body>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={kpisData.comparacionCurso}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="categoria" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="valor" name="Alumnos perfectos" fill="#0066cc" />
                                </BarChart>
                              </ResponsiveContainer>
                            </Card.Body>
                          </Card>
                        </Col>
                      </>
                    )}

                    {/* Distribución por Curso - Solo en modo "Todos" sin filtro Top N */}
                    {modo === 'todos' && topNPorCurso === 'todos' && kpisData.distribucionPorCurso.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Distribución por Curso (1°, 2°, 3°...)</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={kpisData.distribucionPorCurso}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="anio" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="total" name="Total perfectos" fill="#17a2b8" />
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}

                    {/* Top cursos con más perfectos - Solo en modo "Todos" sin filtro Top N y modo "Top Cursos" */}
                    {kpisData.topCursos.length > 0 && modo !== 'curso' && (modo === 'top' || (modo === 'todos' && topNPorCurso === 'todos')) && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Top 10 Cursos con Más Perfectos</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={Math.max(300, kpisData.topCursos.length * 35)}>
                              <BarChart data={kpisData.topCursos} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="curso" width={80} />
                                <Tooltip />
                                <Bar dataKey="perfectos" fill="#28a745" name="Alumnos perfectos" />
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}

                    {/* Distribución: cursos con/sin perfectos */}
                    {kpisData.distribucionData.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Cursos con/sin Perfectos</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={kpisData.distribucionData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                >
                                  {kpisData.distribucionData.map((entry, idx) => (
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

                    {/* Distribución por rangos de perfectos */}
                    <Col sm={12} lg={6}>
                      <Card className="h-100">
                        <Card.Header><strong>Distribución por Cantidad de Perfectos</strong></Card.Header>
                        <Card.Body>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={kpisData.rangosData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="rango" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" name="Cantidad de cursos">
                                {kpisData.rangosData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Perfectos por nivel */}
                    {kpisData.nivelesData.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card className="h-100">
                          <Card.Header><strong>Perfectos por Nivel</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={kpisData.nivelesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nivel" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="perfectos" fill="#007bff" name="Total perfectos" />
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

          {/* Acciones */}
          <div className="d-flex justify-content-end gap-2 mb-3 d-print-none">
            <Button variant="outline-secondary" size="sm" onClick={exportCSV} disabled={!cursos || cursos.length===0}>Exportar CSV</Button>
            <Button variant="outline-secondary" size="sm" onClick={printAll} disabled={!cursos || cursos.length===0}>Imprimir / PDF</Button>
          </div>

          <div ref={printRef}>
            {/* Encabezado */}
            <Card className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div><strong>COLEGIO LUTERANO CONCORDIA</strong></div>
                  <div>Año: {data?.anio ?? anio}</div>
                </div>
                <div className="text-center fw-semibold mt-2">
                  {modo === 'top' ? 'ASISTENCIA PERFECTA · TOP CURSOS' : (modo === 'curso' ? 'ASISTENCIA PERFECTA · POR CURSO' : 'ASISTENCIA PERFECTA · TODOS')}
                </div>
                <div className="mt-2 small">Total alumnos con asistencia perfecta: <strong>{totalPerfectos}</strong></div>
              </Card.Body>
            </Card>

            {/* Contenido según modo */}
            {modo === 'top' && (
              <Card>
                <Card.Body>
                  <Table striped bordered hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Nivel</th>
                        <th>Perfectos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cursosTop || []).length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted">Sin datos</td></tr>
                      )}
                      {(cursosTop || []).map((row, idx) => (
                        <tr key={idx}>
                          <td>{`${row?.curso?.anio ?? ''} ${row?.curso?.division ?? ''}`.trim()}</td>
                          <td>{row?.curso?.nivel ?? '-'}</td>
                          <td><Badge bg="success">{row?.totalPerfectos ?? 0}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {(modo === 'todos' || modo === 'curso') && (
              <Card>
                <Card.Body>
                  <Table striped bordered hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th>Curso</th>
                        <th>Nivel</th>
                        <th className="d-print-none text-center" style={{ width: '200px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modo === 'curso' ? alumnosCurso : alumnosTodos).length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted">Sin datos</td></tr>
                      )}
                      {(modo === 'curso' ? alumnosCurso : alumnosTodos).map((a, i) => (
                        <tr key={a?.id ?? i}>
                          <td>
                            <button 
                              className="btn btn-link p-0 text-start text-decoration-none" 
                              onClick={() => navigate(`/alumno/${a?.id}`)}
                              style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer' }}
                            >
                              {a?.nombre}
                            </button>
                          </td>
                          <td>{a?.dni ?? '-'}</td>
                          <td>{a?.cursoEtiqueta ?? '-'}</td>
                          <td>{a?.nivel ?? '-'}</td>
                          <td className="d-print-none text-center">
                            <ButtonGroup size="sm">
                              <Button 
                                variant="outline-secondary"
                                onClick={() => {
                                  const url = `/reportes/legajo-alumno?alumnoId=${a?.alumnoId || a?.id}`;
                                  window.open(url, '_blank');
                                }}
                                title="Ver legajo completo"
                              >
                                <FileText size={16} className="me-1" />
                                Legajo
                              </Button>
                              <Button 
                                variant="outline-info"
                                onClick={() => {
                                  const url = `/reportes/notas-alumnos?alumnoId=${a?.alumnoId || a?.id}&anio=${anio}`;
                                  window.open(url, '_blank');
                                }}
                                title="Ver notas del alumno"
                              >
                                <GraduationCap size={16} className="me-1" />
                                Notas
                              </Button>
                            </ButtonGroup>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="d-flex align-items-center">
          <Spinner animation="border" className="me-2" /> Cargando datos...
        </div>
      )}
    </div>
  );
}
