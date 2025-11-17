import React, { useState, useRef, useMemo, useEffect } from "react";
import { Card, Button, Form, Row, Col, Spinner, Alert, Table, Badge, Accordion } from "react-bootstrap";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AsyncAlumnoSelect from "../Components/Controls/AsyncAlumnoSelect";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";
import { useCicloLectivo } from "../Context/CicloLectivoContext";
import { useSearchParams } from "react-router-dom";
import { obtenerHistorialCompleto, obtenerHistorialPorCiclo } from "../Services/ReporteHistorialAlumnoService";

export default function ReporteHistorialAlumno() {
  const { user } = useAuth();
  const { cicloLectivo } = useCicloLectivo();
  const token = user?.token;
  const [searchParams] = useSearchParams();
  const autoGenerar = searchParams.get('auto') === 'true';
  const alumnoIdFromUrl = searchParams.get('alumnoId');

  const [alumnoId, setAlumnoId] = useState(alumnoIdFromUrl || "");
  const [alumnoOption, setAlumnoOption] = useState(null);
  const [cursoAnioSel, setCursoAnioSel] = useState("");
  const [divisionSel, setDivisionSel] = useState("");
  const [tipoReporte, setTipoReporte] = useState("completo"); // "completo" o "ciclo"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    if (!alumnoId) {
      setError("Seleccioná un alumno");
      return;
    }
    if (tipoReporte === "ciclo" && !cicloLectivo?.id) {
      setError("No hay ciclo lectivo seleccionado");
      return;
    }
    try {
      setLoading(true);
      let res;
      if (tipoReporte === "completo") {
        res = await obtenerHistorialCompleto(token, alumnoId);
      } else {
        res = await obtenerHistorialPorCiclo(token, alumnoId, cicloLectivo.id);
      }
      if (res?.code && res.code < 0) {
        setError(res.mensaje || "Error en el reporte");
      } else {
        setData(res?.historial || null);
      }
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generar cuando viene de URL
  useEffect(() => {
    if (autoGenerar && alumnoIdFromUrl && token && !data && !loading) {
      const generarAuto = async () => {
        setError("");
        setData(null);
        try {
          setLoading(true);
          let res;
          if (tipoReporte === "completo") {
            res = await obtenerHistorialCompleto(token, alumnoIdFromUrl);
          } else {
            res = await obtenerHistorialPorCiclo(token, alumnoIdFromUrl, cicloLectivo.id);
          }
          if (res?.code && res.code < 0) {
            setError(res.mensaje || "Error en el reporte");
          } else {
            setData(res?.historial || null);
          }
        } catch (err) {
          setError(err.message || "Error al generar reporte");
        } finally {
          setLoading(false);
        }
      };
      generarAuto();
    }
  }, [autoGenerar, alumnoIdFromUrl, token, data, loading, tipoReporte, cicloLectivo]);

  const historial = data;
  const resumen = historial?.resumen;
  const esReporteCompleto = tipoReporte === "completo";

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!historial || !resumen) return null;

    const ciclos = historial.historialPorCiclos || [];
    
    // Evolución del promedio a lo largo de los años
    const evolucionPromedio = ciclos
      .filter(c => c.promedioGeneral != null)
      .map(c => ({
        ciclo: c.cicloNombre || `${c.cicloAnio}`,
        promedio: Number(c.promedioGeneral.toFixed(2)),
        aprobadas: c.materiasAprobadas || 0,
        desaprobadas: c.materiasDesaprobadas || 0
      }));

    // Distribución de materias aprobadas vs desaprobadas
    const distribucionMaterias = [
      { name: 'Aprobadas', value: resumen.totalMateriasAprobadas || 0, color: '#28a745' },
      { name: 'Desaprobadas', value: resumen.totalMateriasDesaprobadas || 0, color: '#dc3545' }
    ];

    // Top materias con mejor promedio (todas las iteraciones)
    const materiasPorNombre = new Map();
    ciclos.forEach(ciclo => {
      (ciclo.materias || []).forEach(m => {
        if (m.promedioGeneral != null) {
          if (!materiasPorNombre.has(m.materiaNombre)) {
            materiasPorNombre.set(m.materiaNombre, { 
              materia: m.materiaNombre, 
              suma: 0, 
              count: 0 
            });
          }
          const obj = materiasPorNombre.get(m.materiaNombre);
          obj.suma += m.promedioGeneral;
          obj.count += 1;
        }
      });
    });

    const topMaterias = Array.from(materiasPorNombre.values())
      .map(obj => ({ 
        materia: obj.materia, 
        promedio: Number((obj.suma / obj.count).toFixed(2)) 
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5); // Top 5 materias

    // Porcentaje de aprobación por ciclo
    const aprobacionPorCiclo = ciclos.map(c => ({
      ciclo: c.cicloNombre || `${c.cicloAnio}`,
      porcentaje: c.materiasTotal > 0 
        ? Number(((c.materiasAprobadas / c.materiasTotal) * 100).toFixed(1))
        : 0
    }));

    return {
      evolucionPromedio,
      distribucionMaterias,
      topMaterias,
      aprobacionPorCiclo
    };
  }, [historial, resumen]);

  const getTendenciaIcon = (tendencia) => {
    if (tendencia === 'MEJORANDO') return <TrendingUp size={20} className="text-success" />;
    if (tendencia === 'EMPEORANDO') return <TrendingDown size={20} className="text-danger" />;
    return <Minus size={20} className="text-secondary" />;
  };

  const getTendenciaColor = (tendencia) => {
    if (tendencia === 'MEJORANDO') return 'success';
    if (tendencia === 'EMPEORANDO') return 'danger';
    return 'secondary';
  };

  const exportCSV = () => {
    if (!historial) return;
    const lines = [];
    lines.push(["HISTORIAL ACADÉMICO COMPLETO"]);
    lines.push([]);
    lines.push(["Alumno", `${historial.apellido || ''}, ${historial.nombre || ''}`.trim()]);
    lines.push(["DNI", historial.dni || '']);
    lines.push(["Estado Actual", historial.estadoActual || '']);
    lines.push([]);
    
    // Resumen
    if (resumen) {
      lines.push(["RESUMEN ESTADÍSTICO"]);
      lines.push(["Total Ciclos Lectivos", resumen.totalCiclosLectivos || 0]);
      lines.push(["Total Materias Aprobadas", resumen.totalMateriasAprobadas || 0]);
      lines.push(["Total Materias Desaprobadas", resumen.totalMateriasDesaprobadas || 0]);
      lines.push(["Promedio General Histórico", resumen.promedioGeneralHistorico || '-']);
      lines.push(["Cantidad Repeticiones", resumen.cantidadRepeticiones || 0]);
      lines.push(["Tendencia Académica", resumen.tendenciaAcademica || '-']);
      lines.push([]);
    }

    // Detalle por ciclo
    (historial.historialPorCiclos || []).forEach(ciclo => {
      lines.push([`CICLO ${ciclo.cicloNombre || ciclo.cicloAnio}`]);
      lines.push(["Curso", `${ciclo.cursoAnio || ''}° ${ciclo.cursoDivision || ''}`.trim()]);
      lines.push(["Nivel", ciclo.cursoNivel || '']);
      lines.push(["Estado", ciclo.estadoCiclo || '']);
      lines.push(["Promedio General", ciclo.promedioGeneral || '-']);
      lines.push(["Materias Aprobadas", ciclo.materiasAprobadas || 0]);
      lines.push(["Materias Desaprobadas", ciclo.materiasDesaprobadas || 0]);
      lines.push([]);
      
      if (ciclo.materias && ciclo.materias.length > 0) {
        lines.push(["Materia", "E1", "E2", "PG", "Nota Final", "Estado"]);
        ciclo.materias.forEach(m => {
          lines.push([
            m.materiaNombre || '',
            m.promedioEtapa1 ?? '-',
            m.promedioEtapa2 ?? '-',
            m.promedioGeneral ?? '-',
            m.notaFinal ?? '-',
            m.estadoMateria || '-'
          ]);
        });
        lines.push([]);
      }
    });

    const csv = lines
      .map(cols => (Array.isArray(cols) ? cols : [cols])
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(','))
      .join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nombreAlumno = `${historial.apellido || ''}_${historial.nombre || ''}`.trim() || 'alumno';
    a.href = url;
    a.download = `historial_academico_${nombreAlumno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 24px; 
        color: #212529;
      }
      h3, h4 { 
        margin: 16px 0 8px 0; 
        font-weight: 600;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        padding-bottom: 6px;
      }
      .section {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 6px;
        margin-bottom: 20px;
        border: 1px solid #dee2e6;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 16px;
        font-size: 11px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 6px 8px; 
        text-align: left;
      }
      thead th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      .badge { 
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        display: inline-block;
      }
      .badge-success { background: #28a745; color: white; }
      .badge-danger { background: #dc3545; color: white; }
      .badge-warning { background: #ffc107; color: #212529; }
      .badge-info { background: #17a2b8; color: white; }
      @media print {
        body { padding: 12px; }
        .section { page-break-inside: avoid; }
      }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Historial Académico</title><style>${css}</style></head><body>`);
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
      <h2 className="mb-2">
        {tipoReporte === "completo" ? "Historial Académico Completo" : `Historial Académico - Ciclo ${cicloLectivo?.anio || ''}`}
      </h2>
      <p className="text-muted mb-3">
        {tipoReporte === "completo" 
          ? "Este reporte muestra el historial académico completo del alumno a través de todos los ciclos lectivos, incluyendo estadísticas, tendencias, logros destacados y áreas de mejora."
          : "Este reporte muestra el desempeño académico del alumno en el ciclo lectivo seleccionado, con estadísticas y análisis de materias."
        }
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={2}>
                <Form.Label>Año (opcional)</Form.Label>
                <Form.Select value={cursoAnioSel} onChange={(e)=>setCursoAnioSel(e.target.value)}>
                  <option value="">Todos</option>
                  {[1, 2, 3, 4, 5, 6].map(an => (
                    <option key={an} value={an}>{an}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>División (opcional)</Form.Label>
                <Form.Select value={divisionSel} onChange={(e)=>setDivisionSel(e.target.value)} disabled={!cursoAnioSel}>
                  <option value="">Todas</option>
                  {['A', 'B', 'C', 'D'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Alumno</Form.Label>
                <AsyncAlumnoSelect
                  token={token}
                  value={alumnoOption}
                  onChange={(opt) => { setAlumnoOption(opt); setAlumnoId(opt?.value || ""); }}
                  cursoAnio={cursoAnioSel}
                  cursoDivision={divisionSel}
                />
              </Col>
              <Col md={2}>
                <Form.Label>Tipo de Reporte</Form.Label>
                <Form.Select value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                  <option value="completo">Historial Completo</option>
                  <option value="ciclo">Ciclo Actual ({cicloLectivo?.anio || '-'})</option>
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end gap-2">
                <Button type="submit" variant="primary" disabled={loading || !alumnoId} className="flex-grow-1">
                  {loading ? (<><Spinner size="sm" animation="border" className="me-2" /> Generando...</>) : "Generar"}
                </Button>
                {(cursoAnioSel || divisionSel || alumnoOption) && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      setCursoAnioSel("");
                      setDivisionSel("");
                      setAlumnoOption(null);
                      setAlumnoId("");
                    }}
                    title="Limpiar filtros"
                  >
                    Limpiar
                  </Button>
                )}
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && historial && !error && (
        <>
          {/* Acciones */}
          <div className="d-flex justify-content-end gap-2 mb-3 d-print-none">
            <Button variant="outline-secondary" size="sm" onClick={exportCSV}>Exportar CSV</Button>
            <Button variant="outline-secondary" size="sm" onClick={printReport}>Imprimir / PDF</Button>
          </div>

          {/* KPIs y Gráficos */}
          {kpisData && resumen && (
            <Accordion className="mb-3 d-print-none">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BarChart3 size={20} className="me-2" />
                  <strong>Análisis Estadístico y Gráficos</strong>
                </Accordion.Header>
                <Accordion.Body>
                  {/* KPIs principales */}
                  <Row className="g-3 mb-4">
                    <Col md={3}>
                      <Card className="h-100 border-primary">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Promedio Histórico</div>
                          <div className="h2 mb-0 text-primary">{resumen.promedioGeneralHistorico?.toFixed(2) || '-'}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 border-success">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Materias Aprobadas</div>
                          <div className="h2 mb-0 text-success">{resumen.totalMateriasAprobadas || 0}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 border-danger">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Materias Desaprobadas</div>
                          <div className="h2 mb-0 text-danger">{resumen.totalMateriasDesaprobadas || 0}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className={`h-100 border-${getTendenciaColor(resumen.tendenciaAcademica)}`}>
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Tendencia</div>
                          <div className="d-flex align-items-center justify-content-center h2 mb-0">
                            {getTendenciaIcon(resumen.tendenciaAcademica)}
                            <span className={`ms-2 text-${getTendenciaColor(resumen.tendenciaAcademica)}`} style={{ fontSize: '1rem' }}>
                              {resumen.tendenciaAcademica === 'MEJORANDO' ? 'Mejorando' : 
                               resumen.tendenciaAcademica === 'EMPEORANDO' ? 'Empeorando' : 'Estable'}
                            </span>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Gráficos */}
                  <Row className="g-3">
                    {/* Evolución del promedio - Solo para historial completo */}
                    {esReporteCompleto && kpisData.evolucionPromedio.length > 1 && (
                      <Col sm={12} lg={6}>
                        <Card>
                          <Card.Body>
                            <h6 className="mb-3">Evolución del Promedio por Ciclo</h6>
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={kpisData.evolucionPromedio}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="ciclo" />
                                <YAxis domain={[0, 10]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="promedio" name="Promedio" stroke="#0066cc" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}

                    {/* Distribución aprobadas/desaprobadas */}
                    <Col sm={12} lg={6}>
                      <Card>
                        <Card.Body>
                          <h6 className="mb-3">Distribución de Materias</h6>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={kpisData.distribucionMaterias}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {kpisData.distribucionMaterias.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Porcentaje de aprobación por ciclo - Solo para historial completo */}
                    {esReporteCompleto && kpisData.aprobacionPorCiclo.length > 1 && (
                      <Col sm={12} lg={6}>
                        <Card>
                          <Card.Body>
                            <h6 className="mb-3">% Aprobación por Ciclo</h6>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={kpisData.aprobacionPorCiclo}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="ciclo" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="porcentaje" name="% Aprobación" fill="#28a745" />
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}

                    {/* Top materias con mejor promedio */}
                    {kpisData.topMaterias.length > 0 && (
                      <Col sm={12} lg={6}>
                        <Card>
                          <Card.Body>
                            <h6 className="mb-3">Top 5 Materias con Mejor Promedio</h6>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={kpisData.topMaterias} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 10]} />
                                <YAxis type="category" dataKey="materia" width={120} />
                                <Tooltip />
                                <Bar dataKey="promedio" name="Promedio" fill="#17a2b8" />
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}
                  </Row>

                  {/* Logros y áreas de mejora */}
                  {(resumen.logrosDestacados?.length > 0 || resumen.areasAMejorar?.length > 0) && (
                    <Row className="g-3 mt-3">
                      {resumen.logrosDestacados && resumen.logrosDestacados.length > 0 && (
                        <Col md={6}>
                          <Card className="border-success">
                            <Card.Header className="bg-success text-white">
                              <strong>Logros Destacados</strong>
                            </Card.Header>
                            <Card.Body>
                              <ul className="mb-0">
                                {resumen.logrosDestacados.map((logro, i) => (
                                  <li key={i}>{logro}</li>
                                ))}
                              </ul>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                      {resumen.areasAMejorar && resumen.areasAMejorar.length > 0 && (
                        <Col md={6}>
                          <Card className="border-warning">
                            <Card.Header className="bg-warning">
                              <strong>Áreas a Mejorar</strong>
                            </Card.Header>
                            <Card.Body>
                              <ul className="mb-0">
                                {resumen.areasAMejorar.map((area, i) => (
                                  <li key={i}>{area}</li>
                                ))}
                              </ul>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}

          {/* Informe detallado para impresión */}
          <div ref={printRef}>
            {/* Encabezado */}
            <Card className="mb-3">
              <Card.Body>
                <table className="table table-bordered table-sm mb-0">
                  <tbody>
                    <tr>
                      <td><strong>COLEGIO LUTERANO CONCORDIA</strong></td>
                      <td className="text-end">Fecha: {new Date().toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        Alumno: <strong>{historial.apellido || '-'}, {historial.nombre || '-'}</strong>
                        &nbsp;&nbsp; DNI: <strong>{historial.dni || '-'}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Estado Actual: <strong>{historial.estadoActual || '-'}</strong></td>
                      <td className="text-end">
                        {resumen && <>Promedio Histórico: <strong>{resumen.promedioGeneralHistorico?.toFixed(2) || '-'}</strong></>}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-center fw-semibold mt-2">HISTORIAL ACADÉMICO COMPLETO</div>
              </Card.Body>
            </Card>

            {/* Resumen estadístico */}
            {resumen && (
              <Card className="mb-3">
                <Card.Header><strong>Resumen Estadístico</strong></Card.Header>
                <Card.Body>
                  <Row className="g-2">
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Total Ciclos Lectivos:</span>
                        <strong>{resumen.totalCiclosLectivos || 0}</strong>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Cantidad de Repeticiones:</span>
                        <strong>{resumen.cantidadRepeticiones || 0}</strong>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Total Materias Aprobadas:</span>
                        <strong className="text-success">{resumen.totalMateriasAprobadas || 0}</strong>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Total Materias Desaprobadas:</span>
                        <strong className="text-danger">{resumen.totalMateriasDesaprobadas || 0}</strong>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Promedio General Histórico:</span>
                        <strong>{resumen.promedioGeneralHistorico?.toFixed(2) || '-'}</strong>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Tendencia Académica:</span>
                        <strong className={`text-${getTendenciaColor(resumen.tendenciaAcademica)}`}>
                          {resumen.tendenciaAcademica === 'MEJORANDO' ? 'Mejorando' : 
                           resumen.tendenciaAcademica === 'EMPEORANDO' ? 'Empeorando' : 'Estable'}
                        </strong>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Historial por ciclos */}
            <h5 className="mt-4 mb-3">
              {esReporteCompleto ? "Detalle por Ciclo Lectivo" : "Detalle de Materias"}
            </h5>
            {(historial.historialPorCiclos || []).map((ciclo, idx) => (
              <Card key={idx} className="mb-3">
                <Card.Header>
                  <strong>Ciclo {ciclo.cicloNombre || ciclo.cicloAnio}</strong>
                  <span className="ms-3 text-muted">
                    Curso: {ciclo.cursoAnio}° {ciclo.cursoDivision} - {ciclo.cursoNivel}
                  </span>
                  <Badge bg="info" className="ms-2">{ciclo.estadoCiclo || ''}</Badge>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <Row className="g-2">
                      <Col md={4}>
                        <span className="text-muted">Promedio General:</span>{' '}
                        <strong>{ciclo.promedioGeneral?.toFixed(2) || '-'}</strong>
                      </Col>
                      <Col md={4}>
                        <span className="text-muted">Materias Aprobadas:</span>{' '}
                        <strong className="text-success">{ciclo.materiasAprobadas || 0}</strong>
                      </Col>
                      <Col md={4}>
                        <span className="text-muted">Materias Desaprobadas:</span>{' '}
                        <strong className="text-danger">{ciclo.materiasDesaprobadas || 0}</strong>
                      </Col>
                    </Row>
                  </div>

                  {ciclo.materias && ciclo.materias.length > 0 && (
                    <Table bordered striped hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>Materia</th>
                          <th>E1</th>
                          <th>E2</th>
                          <th>PG</th>
                          <th>Nota Final</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ciclo.materias.map((m, i) => (
                          <tr key={i}>
                            <td>{m.materiaNombre}</td>
                            <td>{m.promedioEtapa1?.toFixed(2) || '-'}</td>
                            <td>{m.promedioEtapa2?.toFixed(2) || '-'}</td>
                            <td>
                              <Badge bg={m.promedioGeneral >= 6 ? 'success' : 'danger'}>
                                {m.promedioGeneral?.toFixed(2) || '-'}
                              </Badge>
                            </td>
                            <td>{m.notaFinal || '-'}</td>
                            <td>
                              <Badge 
                                bg={m.estadoMateria === 'APROBADA' ? 'success' : 
                                   m.estadoMateria === 'DESAPROBADA' ? 'danger' : 'warning'}>
                                {m.estadoMateria || '-'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            ))}
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
