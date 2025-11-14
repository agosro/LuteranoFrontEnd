import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Accordion, Badge } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { rankingCurso, rankingColegio, rankingTodosCursos } from '../Services/ReporteRankingAlumnoService';
import { toast } from 'react-toastify';
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

export default function ReporteRankingAlumnos() {
  const { user } = useAuth();
  const token = user?.token;
  const { cicloLectivo } = useCicloLectivo();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [modo, setModo] = useState('colegio'); // 'colegio' | 'curso' | 'todos'
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const cs = await listarCursos(token);
        setCursos((cs || []).map(c => ({ value: c.id, label: `${c.anio || ''} ${c.division || ''}`.trim(), raw: c })));
      } catch {
        // noop
      }
    })();
  }, [token]);

  const onGenerar = async () => {
    setError(''); setData(null);
    if (!anio || anio < 2000 || anio > 2100) { setError('Año inválido'); return; }
    if (modo === 'curso' && !cursoId) { setError('Seleccioná un curso'); return; }
    try {
      setLoading(true);
      let res;
      if (modo === 'curso') res = await rankingCurso(token, Number(cursoId), Number(anio));
      else if (modo === 'colegio') res = await rankingColegio(token, Number(anio));
      else res = await rankingTodosCursos(token, Number(anio));
      
      // Verificar si hay datos
      if (modo === 'colegio' && (!res?.ranking || res.ranking.length === 0)) {
        toast.info('No se encontraron datos para el año seleccionado');
      } else if (modo === 'curso' && (!res?.ranking || res.ranking.length === 0)) {
        toast.info('No se encontraron datos para el curso y año seleccionado');
      } else if (modo === 'todos' && (!res?.cursosRanking || res.cursosRanking.length === 0)) {
        toast.info('No se encontraron datos para el año seleccionado');
      }
      
      setData(res);
    } catch (e) {
      console.error('Error en ranking:', e);
      setError(e?.message || 'Error al generar el reporte');
      toast.error(e?.message || 'Error al generar el reporte');
    } finally { setLoading(false); }
  };

  // Normalizadores para resultados (defensivos ante nombres posibles)
  const rankingCursoItems = useMemo(() => Array.isArray(data?.ranking) ? data.ranking : [], [data]);
  const cursoNombre = useMemo(() => data?.cursoNombre || (cursos.find(c=>String(c.value)===String(cursoId))?.label) || '', [data, cursos, cursoId]);

  const rankingColegioItems = useMemo(() => Array.isArray(data?.ranking) ? data.ranking : [], [data]);
  const todosCursosItems = useMemo(() => Array.isArray(data?.cursosRanking) ? data.cursosRanking : [], [data]);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!data) return null;

    let promedios = [];
    let totalAlumnos = 0;

    if (modo === 'colegio') {
      promedios = rankingColegioItems.map(r => r.promedio).filter(v => typeof v === 'number');
      totalAlumnos = rankingColegioItems.length;
    } else if (modo === 'curso') {
      promedios = rankingCursoItems.map(r => r.promedio).filter(v => typeof v === 'number');
      totalAlumnos = rankingCursoItems.length;
    } else {
      // modo === 'todos'
      todosCursosItems.forEach(cr => {
        const cursoPromedios = (cr?.topAlumnos || []).map(r => r.promedio).filter(v => typeof v === 'number');
        promedios.push(...cursoPromedios);
        totalAlumnos += (cr?.topAlumnos || []).length;
      });
    }

    if (promedios.length === 0) return null;

    const promedioGeneral = (promedios.reduce((a,b) => a + b, 0) / promedios.length).toFixed(2);
    const notaMinima = Math.min(...promedios).toFixed(2);
    const notaMaxima = Math.max(...promedios).toFixed(2);

    // Distribución por rangos
    const distribucion = [
      { rango: '0-5', count: 0, color: '#dc3545' },
      { rango: '6-6.9', count: 0, color: '#ffc107' },
      { rango: '7-7.9', count: 0, color: '#17a2b8' },
      { rango: '8-8.9', count: 0, color: '#28a745' },
      { rango: '9-10', count: 0, color: '#20c997' }
    ];

    promedios.forEach(nota => {
      if (nota >= 0 && nota < 6) distribucion[0].count++;
      else if (nota >= 6 && nota < 7) distribucion[1].count++;
      else if (nota >= 7 && nota < 8) distribucion[2].count++;
      else if (nota >= 8 && nota < 9) distribucion[3].count++;
      else if (nota >= 9) distribucion[4].count++;
    });

    // Top 3 alumnos para pie chart
    let top3Data = [];
    if (modo === 'colegio' && rankingColegioItems.length > 0) {
      top3Data = rankingColegioItems.slice(0, 3).map((r, idx) => ({
        name: `${idx + 1}° ${r.apellido || ''}, ${r.nombre || ''}`.trim(),
        promedio: typeof r.promedio === 'number' ? parseFloat(r.promedio.toFixed(2)) : 0
      }));
    } else if (modo === 'curso' && rankingCursoItems.length > 0) {
      top3Data = rankingCursoItems.slice(0, 3).map((r, idx) => ({
        name: `${idx + 1}° ${r.apellido || ''}, ${r.nombre || ''}`.trim(),
        promedio: typeof r.promedio === 'number' ? parseFloat(r.promedio.toFixed(2)) : 0
      }));
    }

    // Distribución por curso (solo para modo 'todos')
    let cursosData = [];
    if (modo === 'todos' && todosCursosItems.length > 0) {
      cursosData = todosCursosItems.map(cr => {
        const cursoPromedios = (cr?.topAlumnos || []).map(r => r.promedio).filter(v => typeof v === 'number');
        const promedioCurso = cursoPromedios.length > 0 ? (cursoPromedios.reduce((a,b) => a + b, 0) / cursoPromedios.length).toFixed(2) : 0;
        return {
          curso: `${cr?.curso?.anio ?? ''} ${cr?.curso?.division ?? ''}`.trim() || 'Curso',
          promedio: parseFloat(promedioCurso),
          alumnos: cr?.totalAlumnos ?? cursoPromedios.length
        };
      }).sort((a, b) => b.promedio - a.promedio);
    }

    return {
      totalAlumnos,
      promedioGeneral,
      notaMinima,
      notaMaxima,
      distribucion,
      top3Data,
      cursosData
    };
  }, [data, modo, rankingColegioItems, rankingCursoItems, todosCursosItems]);

  const exportCSV = () => {
    try {
      const lines = [];
      if (modo === 'colegio') {
        lines.push(['Puesto','Alumno','DNI','Curso','Promedio']);
        (rankingColegioItems || []).forEach((r, idx) => {
          const name = `${r.apellido || ''}, ${r.nombre || ''}`.trim();
          const curso = r.curso ? `${r.curso.anio ?? ''} ${r.curso.division ?? ''}`.trim() : '';
          lines.push([idx + 1, name, r.dni ?? '', curso, (typeof r.promedio === 'number' ? r.promedio.toFixed(2) : r.promedio || '')]);
        });
      } else if (modo === 'curso') {
        lines.push(['Curso', cursoNombre]);
        lines.push(['Año', anio]);
        lines.push([]);
        lines.push(['Puesto','Alumno','DNI','Promedio']);
        (rankingCursoItems || []).forEach((r, idx) => {
          const name = `${r.apellido || ''}, ${r.nombre || ''}`.trim();
          lines.push([idx + 1, name, r.dni ?? '', (typeof r.promedio === 'number' ? r.promedio.toFixed(2) : r.promedio || '')]);
        });
      } else {
        lines.push(['Curso','Puesto','Alumno','DNI','Promedio']);
        (todosCursosItems || []).forEach(cr => {
          const curso = `${cr?.curso?.anio ?? ''} ${cr?.curso?.division ?? ''}`.trim() || '';
          (cr?.topAlumnos || []).forEach((r, idx) => {
            const name = `${r.apellido || ''}, ${r.nombre || ''}`.trim();
            lines.push([curso, idx + 1, name, r.dni ?? '', (typeof r.promedio === 'number' ? r.promedio.toFixed(2) : r.promedio || '')]);
          });
        });
      }
      const csv = lines.map(cols => (Array.isArray(cols) ? cols : [cols]).map(v => '"'+String(v ?? '').replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `reporte_ranking_${modo}_${anio}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('No se pudo exportar CSV'); }
  };

  const printOnly = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank'); if (!win) return;
    const css = `
      @page { size: landscape; margin: 14mm; }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 16px; 
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
        color: #6c757d; 
        font-size: 12px; 
        margin-bottom: 16px; 
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
      thead th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      @media print {
        body { padding: 10px; }
        .kpi-section { page-break-inside: avoid; }
      }
    `;
    const sub = () => {
      if (modo === 'curso') return `Año: ${anio} · Curso: ${cursoNombre || cursoId}`;
      if (modo === 'colegio') return `Año: ${anio} · Ámbito: Colegio`;
      return `Año: ${anio} · Ámbito: Todos los cursos`;
    };
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ranking de Alumnos</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Ranking de Alumnos</h3>`);
    win.document.write(`<div class="sub">${sub()}</div>`);
    
    // KPIs en formato texto
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Resumen Estadístico</div>`);
      
      // Métricas principales
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio General</div><div class="kpi-value">${kpisData.promedioGeneral}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Máxima</div><div class="kpi-value">${kpisData.notaMaxima}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Mínima</div><div class="kpi-value">${kpisData.notaMinima}</div></div>`);
      win.document.write(`</div>`);
      
      // Distribución
      win.document.write(`<div class="kpi-distribution">`);
      win.document.write(`<strong>Distribución de Promedios:</strong><br>`);
      kpisData.distribucion.forEach(d => {
        win.document.write(`<div class="kpi-dist-item"><span>Rango ${d.rango}:</span><span><strong>${d.count}</strong> alumnos</span></div>`);
      });
      win.document.write(`</div>`);
      
      win.document.write(`</div>`);
    }
    
    win.document.write(`<div>${printRef.current.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-1">Ranking de Alumnos</h2>
      <div className="mb-3">
        {cicloLectivo?.id ? (
          <Badge bg="secondary">Ciclo lectivo: {String(cicloLectivo?.nombre || cicloLectivo?.id)}</Badge>
        ) : (
          <Alert variant="warning" className="py-1 px-2 mb-0">Seleccioná un ciclo lectivo en Configuración &gt; Ciclo lectivo</Alert>
        )}
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3} sm={6} xs={12}>
              <Form.Label>Ámbito</Form.Label>
              <Form.Select value={modo} onChange={(e)=>setModo(e.target.value)}>
                <option value="colegio">Colegio</option>
                <option value="curso">Por curso</option>
                <option value="todos">Todos los cursos</option>
              </Form.Select>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Label>Año</Form.Label>
              <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value))} />
            </Col>
            {modo === 'curso' && (
              <Col md={3} sm={6} xs={12}>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {cursos.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </Form.Select>
              </Col>
            )}
            <Col md="auto">
              <Button onClick={onGenerar} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Generar'}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* KPIs y Gráficos desplegables - FUERA del área de impresión */}
      {!error && data && kpisData && (
        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <BarChart3 size={18} className="me-2" />
              <strong>Análisis Detallado y Gráficos</strong>
            </Accordion.Header>
            <Accordion.Body>
              {/* KPIs en Cards */}
              <Row className="g-3 mb-4">
                <Col md={3}>
                  <Card className="h-100 border-primary">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Total Alumnos</div>
                      <div className="h2 mb-0 text-primary">{kpisData.totalAlumnos}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-info">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Promedio General</div>
                      <div className="h2 mb-0 text-info">{kpisData.promedioGeneral}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-success">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Nota Máxima</div>
                      <div className="h2 mb-0 text-success">{kpisData.notaMaxima}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-danger">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Nota Mínima</div>
                      <div className="h2 mb-0 text-danger">{kpisData.notaMinima}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Gráficos */}
              <Row className="g-3">
                <Col md={modo === 'todos' ? 12 : 7}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Distribución de Promedios</h6>
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
                {modo !== 'todos' && kpisData.top3Data.length > 0 && (
                  <Col md={5}>
                    <Card>
                      <Card.Body>
                        <h6 className="mb-3">Top 3 Alumnos</h6>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={kpisData.top3Data} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                            <YAxis domain={[0, 10]} />
                            <Tooltip />
                            <Bar dataKey="promedio" name="Promedio" fill="#ffc107" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {modo === 'todos' && kpisData.cursosData.length > 0 && (
                  <Col md={12}>
                    <Card>
                      <Card.Body>
                        <h6 className="mb-3">Promedio por Curso</h6>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={kpisData.cursosData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="curso" />
                            <YAxis domain={[0, 10]} />
                            <Tooltip 
                              formatter={(value, name) => {
                                if (name === 'promedio') return [value, 'Promedio'];
                                return [value, name];
                              }}
                              labelFormatter={(label) => {
                                const curso = kpisData.cursosData.find(c => c.curso === label);
                                return `${label} (${curso?.alumnos || 0} alumnos)`;
                              }}
                            />
                            <Legend />
                            <Bar dataKey="promedio" name="Promedio" fill="#0066cc" />
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

      {!error && data && (
        <>
          <div className="d-flex justify-content-end gap-2 mb-3">
            <Button size="sm" variant="outline-secondary" onClick={exportCSV}>Exportar CSV</Button>
            <Button size="sm" variant="outline-secondary" onClick={printOnly}>Imprimir / PDF</Button>
          </div>

          <div ref={printRef}>
            {modo === 'colegio' && (
              <Card>
                <Card.Header><strong>Top alumnos — Colegio</strong></Card.Header>
                <Card.Body className="p-0">
                  <Table striped hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th>Curso</th>
                        <th className="text-end">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rankingColegioItems || []).length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted py-3">Sin datos</td></tr>
                      )}
                      {(rankingColegioItems || []).map((r, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{`${r.apellido || ''}, ${r.nombre || ''}`.trim()}</td>
                          <td>{r.dni ?? '-'}</td>
                          <td>{r.curso ? `${r.curso.anio ?? ''} ${r.curso.division ?? ''}`.trim() : '-'}</td>
                          <td className="text-end"><Badge bg="light" text="dark">{typeof r.promedio === 'number' ? r.promedio.toFixed(2) : (r.promedio || '-')}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {modo === 'curso' && (
              <Card>
                <Card.Header><strong>Top alumnos — Curso {cursoNombre || cursoId}</strong></Card.Header>
                <Card.Body className="p-0">
                  <Table striped hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th className="text-end">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rankingCursoItems || []).length === 0 && (
                        <tr><td colSpan={4} className="text-center text-muted py-3">Sin datos</td></tr>
                      )}
                      {(rankingCursoItems || []).map((r, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{`${r.apellido || ''}, ${r.nombre || ''}`.trim()}</td>
                          <td>{r.dni ?? '-'}</td>
                          <td className="text-end"><Badge bg="light" text="dark">{typeof r.promedio === 'number' ? r.promedio.toFixed(2) : (r.promedio || '-')}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {modo === 'todos' && (
              <Accordion alwaysOpen>
                {(todosCursosItems || []).map((cr, idx) => (
                  <Accordion.Item key={idx} eventKey={String(idx)}>
                    <Accordion.Header>
                      <div className="w-100 d-flex justify-content-between">
                        <span><strong>{`${cr?.curso?.anio ?? ''} ${cr?.curso?.division ?? ''}`.trim() || 'Curso'}</strong></span>
                        <span className="text-muted small">Alumnos: {cr?.totalAlumnos ?? '-'}</span>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Table striped hover responsive size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Alumno</th>
                            <th>DNI</th>
                            <th className="text-end">Promedio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cr?.topAlumnos || []).length === 0 && (
                            <tr><td colSpan={4} className="text-center text-muted py-3">Sin datos</td></tr>
                          )}
                          {(cr?.topAlumnos || []).map((r, jx) => (
                            <tr key={jx}>
                              <td>{jx + 1}</td>
                              <td>{`${r.apellido || ''}, ${r.nombre || ''}`.trim()}</td>
                              <td>{r.dni ?? '-'}</td>
                              <td className="text-end"><Badge bg="light" text="dark">{typeof r.promedio === 'number' ? r.promedio.toFixed(2) : (r.promedio || '-')}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
                {(todosCursosItems || []).length === 0 && (
                  <div className="text-center text-muted py-3">Sin datos</div>
                )}
              </Accordion>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="d-flex align-items-center"><Spinner animation="border" className="me-2" /> Cargando datos...</div>
      )}
    </div>
  );
}
