import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Form, Button, Spinner, Table, Badge, Alert, Accordion } from 'react-bootstrap';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import AsyncDocenteSelect from '../Components/Controls/AsyncDocenteSelect';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { reporteCompleto, reportePorDocente, reportePorCurso, reportePorMateria } from '../Services/ReporteDesempenoDocenteService';
import { toast } from 'react-toastify';
// Exportación a PDF: este reporte usará ventana de impresión, igual que otros reportes del sistema

export default function ReporteDesempenoDocente() {
  const { user } = useAuth();
  const token = user?.token;
  const navigate = useNavigate();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [docenteOpt, setDocenteOpt] = useState(null);
  const [docenteId, setDocenteId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [cursosList, materiasList] = await Promise.all([
          listarCursos(token).catch(() => []),
          listarMaterias(token).catch(() => [])
        ]);
        setCursos(Array.isArray(cursosList) ? cursosList : []);
        setMaterias(Array.isArray(materiasList) ? materiasList : []);
      } catch {
        // silencioso
      }
    })();
  }, [token]);

  const generar = async () => {
    if (!anio || anio < 2000 || anio > 2100) {
      toast.error('Año inválido');
      return;
    }
    if (cursoId) {
      toast.error('El reporte por curso aún no está implementado en el backend. Pedí que agreguen el endpoint: GET /reportes/desempeno-docente/{anio}/curso/{cursoId}');
      return;
    }
    setCargando(true);
    setData(null);
    try {
      let resp;
      if (materiaId) {
        resp = await reportePorMateria(token, anio, Number(materiaId));
      } else if (docenteId) {
        resp = await reportePorDocente(token, anio, Number(docenteId));
      } else {
        resp = await reporteCompleto(token, anio);
      }
      setData(resp);
      toast.success('Reporte generado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo generar el reporte');
    } finally { setCargando(false); }
  };

  const materiasOpts = useMemo(() => {
    const arr = Array.isArray(materias) ? materias : [];
    return arr.map((m) => ({
      value: m.id ?? m.materiaId ?? '',
      label: m.nombre ?? m.nombreMateria ?? `Materia ${m.id ?? ''}`,
    })).filter(o => o.value !== '');
  }, [materias]);

  const resultadosMateria = useMemo(() => {
    return Array.isArray(data?.resultadosPorMateria) ? data.resultadosPorMateria : [];
  }, [data]);

  const resultadosDocente = useMemo(() => {
    const top = Array.isArray(data?.resultadosPorDocente) ? data.resultadosPorDocente : [];
    if (top.length > 0) return top;
    // Recolectar de materias
    const col = [];
    for (const m of resultadosMateria) {
      if (Array.isArray(m?.resultadosPorDocente)) col.push(...m.resultadosPorDocente);
    }
    return col;
  }, [data, resultadosMateria]);

  const docenteRows = useMemo(() => {
    return (Array.isArray(resultadosDocente) ? resultadosDocente : []).map((d) => ({
      docente: d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`,
      materia: d.nombreMateria || d.materiaNombre || '-',
      curso: d.cursoCompleto || '-',
      alumnos: d.totalAlumnos ?? '',
      aprobados: d.alumnosAprobados ?? '',
      desaprobados: d.alumnosDesaprobados ?? '',
      aprobacion: typeof d.porcentajeAprobacion === 'number' ? d.porcentajeAprobacion.toFixed(2) : '',
      promedio: typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '',
      estado: d.estadoAnalisis || '',
    }));
  }, [resultadosDocente]);

  const exportCSV = () => {
    if (!docenteRows.length) {
      toast.info('No hay datos para exportar');
      return;
    }
    const headers = ['Docente', 'Materia', 'Curso', 'Alumnos', 'Aprobados', 'Desaprobados', '% Aprobación', 'Promedio', 'Estado'];
    const escape = (s) => (`${s ?? ''}`.includes(',') || `${s ?? ''}`.includes('"'))
      ? `"${`${s ?? ''}`.replace(/"/g, '""')}`
      : `${s ?? ''}`;
    const lines = [headers.join(',')].concat(docenteRows.map(r => [r.docente, r.materia, r.curso, r.alumnos, r.aprobados, r.desaprobados, r.aprobacion, r.promedio, r.estado].map(escape).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-desempeno-docente-${anio}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Imprimir / exportar a PDF vía diálogo de impresión del navegador
  const printOnly = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      @page { size: landscape; margin: 16mm; }
      body { font-family: Arial, sans-serif; padding: 12px; }
      h3 { margin: 0 0 10px 0; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
    `;
    const findMateriaLabel = () => (materiasOpts.find(o => String(o.value)===String(materiaId))?.label || 'Todas');
    const findDocenteLabel = () => docenteOpt?.label || 'Todos';
    const findCursoLabel = () => {
      const c = cursos.find(x => String(x.id) === String(cursoId));
      return c ? `${c.anio || ''}° ${c.division || ''}` : 'Todos';
    };
    const filtros = [
      `Año: ${anio}`,
      `Curso: ${cursoId ? findCursoLabel() : 'Todos'}`,
      `Materia: ${materiaId ? findMateriaLabel() : 'Todas'}`,
      `Docente: ${docenteId ? findDocenteLabel() : 'Todos'}`,
    ].join(' · ');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Desempeño Docente</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Reporte de desempeño docente</h3>`);
    win.document.write(`<div class="sub">${filtros}</div>`);
    win.document.write(`<div>${printRef.current.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">Reporte de desempeño docente</h3>
          
          <p className="text-muted small mb-3">
            Este reporte analiza el rendimiento académico de los docentes según los resultados de sus alumnos. 
            Incluye porcentajes de aprobación, promedios generales y estado de desempeño por materia y curso.
          </p>

          <Alert variant="warning" className="mb-3">
            <strong>⚠️ Recomendación:</strong> Si generás el reporte completo de todo el año puede demorar debido a la cantidad de datos. 
            Se recomienda filtrar por <strong>Curso</strong> o <strong>Materia</strong> para obtener resultados más rápidos y específicos.
          </Alert>

          {/* Filtros */}
          <Row className="g-3 align-items-end">
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value))} />
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Curso (opcional)</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                  <option value="">-- Todos --</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>
                      {`${c.anio || ''}° ${c.division || ''}`.trim()}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Materia (opcional)</Form.Label>
                <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)}>
                  <option value="">-- Todas --</option>
                  {materiasOpts.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Docente (opcional)</Form.Label>
                <AsyncDocenteSelect
                  token={token}
                  value={docenteOpt}
                  onChange={(opt) => { setDocenteOpt(opt); setDocenteId(opt?.value || ''); }}
                  placeholder="Seleccioná un docente"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-4 g-2">
            <Col md="auto">
              <Button onClick={generar} disabled={cargando}>{cargando ? <Spinner size="sm"/> : 'Generar'}</Button>
            </Col>
            <Col md="auto">
              <Button variant="outline-secondary" onClick={exportCSV} disabled={cargando || !data}>Exportar CSV</Button>
            </Col>
            <Col md="auto">
              <Button variant="outline-secondary" onClick={printOnly} disabled={cargando || !data}>Imprimir / PDF</Button>
            </Col>
          </Row>

          {/* Resultados */}
          {data && (
            <div ref={printRef}>
              <hr />
              <Alert variant="info" className="mb-3">
                {data.mensaje || 'Reporte generado'}
              </Alert>

              <Row className="g-3 mb-3">
                <Col md={3}><strong>Materias:</strong> {data.totalMaterias ?? (resultadosMateria.length || '-')}</Col>
                <Col md={3}><strong>Docentes:</strong> {data.totalDocentes ?? '-'}</Col>
                <Col md={3}><strong>Alumnos:</strong> {data.totalAlumnos ?? '-'}</Col>
                <Col md={3}><strong>Cursos:</strong> {data.totalCursos ?? '-'}</Col>
              </Row>
              {data.resumenEjecutivo && <p className="text-muted">{data.resumenEjecutivo}</p>}

              {Array.isArray(data.hallazgosImportantes) && data.hallazgosImportantes.length > 0 && (
                <>
                  <h5>Hallazgos importantes</h5>
                  <ul>
                    {data.hallazgosImportantes.map((h, idx) => <li key={idx}>{h}</li>)}
                  </ul>
                </>
              )}

              {Array.isArray(data.recomendaciones) && data.recomendaciones.length > 0 && (
                <>
                  <h5>Recomendaciones</h5>
                  <ul>
                    {data.recomendaciones.map((r, idx) => <li key={idx}>{r}</li>)}
                  </ul>
                </>
              )}

              {resultadosMateria.length > 0 && (
                <>
                  <h4 className="mt-4">Resultados por materia</h4>
                  <Accordion alwaysOpen className="mt-2">
                    {resultadosMateria.map((m, ix) => (
                      <Accordion.Item eventKey={String(ix)} key={ix}>
                        <Accordion.Header>
                          <div className="w-100 d-flex justify-content-between">
                            <span><strong>{m.nombreMateria || m.materiaNombre || `Materia ${m.materiaId || ''}`}</strong></span>
                            <span className="text-muted">Aprobación prom.: {Number(m.promedioAprobacionMateria ?? 0).toFixed(2)}%</span>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Table striped hover responsive size="sm" className="mb-3">
                            <thead>
                              <tr>
                                <th>Docente</th>
                                <th>Curso</th>
                                <th>Alumnos</th>
                                <th>Aprobados</th>
                                <th>Desaprobados</th>
                                <th>% Aprob.</th>
                                <th>Promedio</th>
                                <th>Estado</th>
                                <th className="d-print-none">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(m.resultadosPorDocente || []).map((d, jx) => (
                                <tr key={jx}>
                                  <td>{d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`}</td>
                                  <td>{d.cursoCompleto || '-'}</td>
                                  <td>{d.totalAlumnos ?? '-'}</td>
                                  <td>{d.alumnosAprobados ?? '-'}</td>
                                  <td>{d.alumnosDesaprobados ?? '-'}</td>
                                  <td>{typeof d.porcentajeAprobacion === 'number' ? `${d.porcentajeAprobacion.toFixed(2)}%` : '-'}</td>
                                  <td>{typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '-'}</td>
                                  <td>
                                    {d.estadoAnalisis ? (
                                      <Badge bg={d.estadoAnalisis === 'EXCELENTE' ? 'success' : (d.estadoAnalisis === 'PREOCUPANTE' ? 'danger' : 'secondary')}>
                                        {d.estadoAnalisis}
                                      </Badge>
                                    ) : '-' }
                                  </td>
                                  <td className="d-print-none">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => {
                                        if (d.cursoId && d.materiaId) {
                                          window.open(`/reportes/notas-por-curso?cursoId=${d.cursoId}&materiaId=${d.materiaId}`, '_blank');
                                        }
                                      }}
                                      disabled={!d.cursoId || !d.materiaId}
                                    >
                                      Ver notas
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>

                          <div className="small text-muted">
                            Total docentes: {m.totalDocentes ?? '-'} — Total alumnos: {m.totalAlumnos ?? '-'}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              )}

              {resultadosDocente.length > 0 && resultadosMateria.length === 0 && (
                <>
                  <h4 className="mt-4">Resultados por docente</h4>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>Docente</th>
                        <th>Materia</th>
                        <th>Curso</th>
                        <th>Alumnos</th>
                        <th>Aprobados</th>
                        <th>Desaprobados</th>
                        <th>% Aprob.</th>
                        <th>Promedio</th>
                        <th>Estado</th>
                        <th className="d-print-none">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosDocente.map((d, idx) => (
                        <tr key={idx}>
                          <td>{d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`}</td>
                          <td>{d.nombreMateria || '-'}</td>
                          <td>{d.cursoCompleto || '-'}</td>
                          <td>{d.totalAlumnos ?? '-'}</td>
                          <td>{d.alumnosAprobados ?? '-'}</td>
                          <td>{d.alumnosDesaprobados ?? '-'}</td>
                          <td>{typeof d.porcentajeAprobacion === 'number' ? `${d.porcentajeAprobacion.toFixed(2)}%` : '-'}</td>
                          <td>{typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '-'}</td>
                          <td>
                            {d.estadoAnalisis ? (
                              <Badge bg={d.estadoAnalisis === 'EXCELENTE' ? 'success' : (d.estadoAnalisis === 'PREOCUPANTE' ? 'danger' : 'secondary')}>
                                {d.estadoAnalisis}
                              </Badge>
                            ) : '-' }
                          </td>
                          <td className="d-print-none">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                if (d.cursoId && d.materiaId) {
                                  window.open(`/reportes/notas-por-curso?cursoId=${d.cursoId}&materiaId=${d.materiaId}`, '_blank');
                                }
                              }}
                              disabled={!d.cursoId || !d.materiaId}
                            >
                              Ver notas
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
