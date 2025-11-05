import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Badge, ListGroup } from 'react-bootstrap';
import { ChevronRight, ChevronDown } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { institucional, porMateria, porCurso, resumen as resumenSvc } from '../Services/ReporteExamenesConsecutivosService';
import { toast } from 'react-toastify';

export default function ReporteExamenesConsecutivos() {
  const { user } = useAuth();
  const token = user?.token;
  const rol = user?.rol;

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [ambito, setAmbito] = useState('institucional'); // institucional | materia | curso | resumen
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [cs, ms] = await Promise.all([
          listarCursos(token).catch(() => []),
          listarMaterias(token).catch(() => [])
        ]);
        setCursos((cs || []).map(c => ({
          value: c.id,
          label: `${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim(),
          raw: c
        })));
        setMaterias((ms || []).map(m => ({
          value: m.id ?? m.materiaId ?? m.codigo ?? '',
          label: m.nombre ?? m.nombreMateria ?? m.descripcion ?? `Materia ${m.id ?? m.materiaId ?? ''}`,
          raw: m
        })).filter(o => o.value !== ''));
      } catch {
        // ignore
      }
    })();
  }, [token]);

  // Ambitos permitidos según rol
  const allowed = useMemo(() => ({
    institucional: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR'].includes(rol),
    materia: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR','ROLE_DOCENTE'].includes(rol),
    curso: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR'].includes(rol),
    resumen: ['ROLE_ADMIN','ROLE_DIRECTOR'].includes(rol),
  }), [rol]);

  // Asegurar que el ámbito seleccionado sea válido para el rol actual
  useEffect(() => {
    if (!allowed[ambito]) {
      const order = ['institucional','materia','curso','resumen'];
      const firstAllowed = order.find(a => allowed[a]);
      if (firstAllowed) setAmbito(firstAllowed);
    }
  }, [allowed, ambito]);

  const onGenerar = async () => {
    setError(''); setData(null);
    if (!anio || anio < 2000 || anio > 2100) { setError('Año inválido'); return; }
    if (ambito === 'curso' && !cursoId) { setError('Seleccioná un curso'); return; }
    if (ambito === 'materia' && !materiaId) { setError('Seleccioná una materia'); return; }
    try {
      setLoading(true);
      let res;
      if (ambito === 'institucional') res = await institucional(token, Number(anio));
      else if (ambito === 'materia') res = await porMateria(token, Number(materiaId), Number(anio));
      else if (ambito === 'curso') res = await porCurso(token, Number(cursoId), Number(anio));
      else res = await resumenSvc(token, Number(anio));
      setData(res);
    } catch (e) {
      setError(e?.message || 'Error al generar el reporte');
    } finally { setLoading(false); }
  };

  const casos = useMemo(() => Array.isArray(data?.casosDetectados) ? data.casosDetectados : [], [data]);
  const [expanded, setExpanded] = useState(new Set());
  const groupedCasos = useMemo(() => {
    const map = new Map();
    const rank = (r) => (r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    casos.forEach((c) => {
      const nombre = c?.nombreCompleto || `${c?.alumnoApellido || ''}, ${c?.alumnoNombre || ''}`.trim();
      const key = c?.alumnoId ?? nombre;
      let g = map.get(key);
      if (!g) {
        g = { key, nombre, casos: [], materias: new Set(), cursos: new Set(), maxR: 0 };
        map.set(key, g);
      }
      g.casos.push(c);
      if (c?.materiaNombre) g.materias.add(c.materiaNombre);
  const cursoBasic = `${c?.anio ? c.anio + '°' : ''} ${c?.division ?? ''}`.trim();
  const cursoStr = cursoBasic || c?.cursoNombre || '';
      if (cursoStr) g.cursos.add(cursoStr);
      g.maxR = Math.max(g.maxR, rank(c?.estadoRiesgo));
    });
    const label = (n) => (n === 3 ? 'CRÍTICO' : n === 2 ? 'ALTO' : n === 1 ? 'MEDIO' : null);
    return Array.from(map.values()).map(g => ({
      ...g,
      materias: Array.from(g.materias),
      cursos: Array.from(g.cursos),
      maxRiesgoLabel: label(g.maxR)
    }));
  }, [casos]);
  const toggleGroup = (key) => setExpanded(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const resumenPorMateria = useMemo(() => Array.isArray(data?.resumenPorMateria) ? data.resumenPorMateria : [], [data]);
  const recomendaciones = useMemo(() => Array.isArray(data?.recomendaciones) ? data.recomendaciones : [], [data]);

  const exportCSV = () => {
    try {
      const lines = [];
      // encabezado/metadata
      lines.push(['Ciclo lectivo', anio]);
      if (ambito === 'curso') {
        const cur = cursos.find(c => String(c.value) === String(cursoId))?.label || cursoId;
        lines.push(['Ámbito', `Curso ${cur}`]);
      } else if (ambito === 'materia') {
        const mat = materias.find(m => String(m.value) === String(materiaId))?.label || materiaId;
        lines.push(['Ámbito', `Materia ${mat}`]);
      } else {
        lines.push(['Ámbito', ambito === 'institucional' ? 'Institucional' : 'Resumen ejecutivo']);
      }
      if (typeof data?.totalAlumnosEnRiesgo !== 'undefined') lines.push(['Total alumnos en riesgo', data.totalAlumnosEnRiesgo]);
      if (typeof data?.totalMateriasAfectadas !== 'undefined') lines.push(['Total materias afectadas', data.totalMateriasAfectadas]);
      if (typeof data?.totalCursosAfectados !== 'undefined') lines.push(['Total cursos afectados', data.totalCursosAfectados]);
      if (typeof data?.casosCriticos !== 'undefined') lines.push(['Casos críticos', data.casosCriticos]);
      if (typeof data?.casosAltos !== 'undefined') lines.push(['Casos altos', data.casosAltos]);
      if (typeof data?.casosMedios !== 'undefined') lines.push(['Casos medios', data.casosMedios]);

      lines.push([]);
      if (resumenPorMateria.length) {
        lines.push(['Resumen por materia']);
        lines.push(['Materia','Total casos','Críticos','Altos','Medios']);
        resumenPorMateria.forEach(r => lines.push([r.materiaNombre || '-', r.totalCasos ?? '', r.casosCriticos ?? '', r.casosAltos ?? '', r.casosMedios ?? '']));
        lines.push([]);
      }

      // Detalle de casos
      lines.push(['Casos detectados']);
      lines.push(['Alumno','Materia','Curso','Primera nota','Segunda nota','Descripción','Riesgo']);
      casos.forEach(c => {
        const alumno = c.nombreCompleto || `${c.alumnoApellido || ''}, ${c.alumnoNombre || ''}`.trim();
        const mat = c.materiaNombre || '-';
  const curso = `${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim() || c.cursoNombre || '';
        const n1 = `E${c.etapaPrimeraNota ?? ''}-N${c.numeroPrimeraNota ?? ''}: ${c.primeraNota ?? ''}`;
        const n2 = `E${c.etapaSegundaNota ?? ''}-N${c.numeroSegundaNota ?? ''}: ${c.segundaNota ?? ''}`;
        lines.push([alumno, mat, curso, n1, n2, c.descripcionConsecutivo || '', c.estadoRiesgo || '']);
      });

      const csv = lines.map(cols => (Array.isArray(cols) ? cols : [cols]).map(v => '"'+String(v ?? '').replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `reporte_examenes_consecutivos_${ambito}_${anio}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('No se pudo exportar CSV'); }
  };

  const printOnly = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank'); if (!win) return;
    const css = `
      @page { size: landscape; margin: 14mm; }
      body { font-family: Arial, sans-serif; padding: 10px; }
      h3 { margin: 0 0 10px 0; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
    `;
    const amb = ambito === 'institucional' ? 'Institucional' : ambito === 'materia' ? `Materia: ${materias.find(m=>String(m.value)===String(materiaId))?.label || materiaId}` : ambito === 'curso' ? `Curso: ${cursos.find(c=>String(c.value)===String(cursoId))?.label || cursoId}` : 'Resumen ejecutivo';
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Exámenes consecutivos desaprobados</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Exámenes consecutivos desaprobados</h3>`);
    win.document.write(`<div class="sub">Año: ${anio} · Ámbito: ${amb}</div>`);
    win.document.write(`<div>${printRef.current.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-3">Exámenes consecutivos desaprobados</h2>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3} sm={6} xs={12}>
              <Form.Label>Ámbito</Form.Label>
              <Form.Select value={ambito} onChange={(e)=>setAmbito(e.target.value)}>
                {allowed.institucional && <option value="institucional">Institucional</option>}
                {allowed.materia && <option value="materia">Por materia</option>}
                {allowed.curso && <option value="curso">Por curso</option>}
                {allowed.resumen && <option value="resumen">Resumen ejecutivo</option>}
              </Form.Select>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Label>Año</Form.Label>
              <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value))} />
            </Col>
            {ambito === 'materia' && (
              <Col md={4} sm={6} xs={12}>
                <Form.Label>Materia</Form.Label>
                <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {materias.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </Form.Select>
              </Col>
            )}
            {ambito === 'curso' && (
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

      {!error && data && (
        <>
          <div className="d-flex justify-content-end gap-2 mb-3">
            <Button size="sm" variant="outline-secondary" onClick={exportCSV}>Exportar CSV</Button>
            <Button size="sm" variant="outline-secondary" onClick={printOnly}>Imprimir / PDF</Button>
          </div>

          <div ref={printRef}>
            {/* Banner de interpretación del riesgo */}
            <Card className="mb-3">
              <Card.Body className="py-2">
                <div className="fw-semibold mb-2">Niveles de riesgo (según promedio de ambas notas):</div>
                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="danger">CRÍTICO</Badge>
                    <span className="text-muted">Promedio ≤ 4.0</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="warning" text="dark">ALTO</Badge>
                    <span className="text-muted">Promedio ≤ 5.0</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="info" text="dark">MEDIO</Badge>
                    <span className="text-muted">Promedio entre 5.1 y 6.9</span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* KPIs */}
            <Row className="g-3 mb-3">
              {typeof data.totalAlumnosEnRiesgo !== 'undefined' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Alumnos en riesgo</div><div className="h4 m-0">{data.totalAlumnosEnRiesgo}</div></Card.Body></Card></Col>
              )}
              {typeof data.totalMateriasAfectadas !== 'undefined' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Materias afectadas</div><div className="h4 m-0">{data.totalMateriasAfectadas}</div></Card.Body></Card></Col>
              )}
              {typeof data.totalCursosAfectados !== 'undefined' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Cursos afectados</div><div className="h4 m-0">{data.totalCursosAfectados}</div></Card.Body></Card></Col>
              )}
              {(typeof data.casosCriticos !== 'undefined' || typeof data.casosAltos !== 'undefined' || typeof data.casosMedios !== 'undefined') && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body>
                  <div className="text-muted small mb-1">Riesgo</div>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {typeof data.casosCriticos !== 'undefined' && <Badge bg="danger">Críticos: {data.casosCriticos}</Badge>}
                    {typeof data.casosAltos !== 'undefined' && <Badge bg="warning" text="dark">Altos: {data.casosAltos}</Badge>}
                    {typeof data.casosMedios !== 'undefined' && <Badge bg="info" text="dark">Medios: {data.casosMedios}</Badge>}
                  </div>
                </Card.Body></Card></Col>
              )}
            </Row>

            {/* Resumen por materia */}
            {resumenPorMateria.length > 0 && (
              <Card className="mb-3">
                <Card.Header><strong>Resumen por materia</strong></Card.Header>
                <Card.Body className="p-0">
                  <Table striped hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th className="text-end">Total</th>
                        <th className="text-end">Críticos</th>
                        <th className="text-end">Altos</th>
                        <th className="text-end">Medios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenPorMateria.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.materiaNombre || '-'}</td>
                          <td className="text-end">{r.totalCasos ?? '-'}</td>
                          <td className="text-end">{r.casosCriticos ?? '-'}</td>
                          <td className="text-end">{r.casosAltos ?? '-'}</td>
                          <td className="text-end">{r.casosMedios ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {/* Casos detectados */}
            <Card className="mb-3">
              <Card.Header><strong>Casos detectados</strong></Card.Header>
              <Card.Body className="p-0">
                <Table striped hover responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Materia</th>
                      <th>Curso</th>
                      <th>1er examen</th>
                      <th>2do examen</th>
                      <th>Descripción</th>
                      <th>Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedCasos.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted py-3">Sin resultados</td></tr>
                    )}
                    {groupedCasos.map((g, gi) => (
                      <React.Fragment key={g.key ?? gi}>
                        <tr className="table-active">
                          <td colSpan={7}>
                            <Button variant="link" size="sm" className="p-0 me-2 align-middle" onClick={() => toggleGroup(g.key)}>
                              {expanded.has(g.key) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </Button>
                            <span>{g.nombre}</span>
                            <span className="text-muted small ms-2">({g.casos.length} casos · {g.materias.length} materias · {g.cursos.length} cursos)</span>
                            {g.maxRiesgoLabel && (
                              <Badge bg={g.maxRiesgoLabel === 'CRÍTICO' ? 'danger' : g.maxRiesgoLabel === 'ALTO' ? 'warning' : 'info'} text={g.maxRiesgoLabel === 'ALTO' || g.maxRiesgoLabel === 'MEDIO' ? 'dark' : undefined} className="ms-2">
                                {g.maxRiesgoLabel}
                              </Badge>
                            )}
                          </td>
                        </tr>
                        {expanded.has(g.key) && g.casos.map((c, ci) => (
                          <tr key={`${g.key}-${ci}`}>
                            <td className="text-muted ps-4">•</td>
                            <td>{c.materiaNombre || '-'}</td>
                            <td>{`${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim() || c.cursoNombre || '-'}</td>
                            <td>{`E${c.etapaPrimeraNota ?? ''}-N${c.numeroPrimeraNota ?? ''}: ${c.primeraNota ?? ''}`}</td>
                            <td>{`E${c.etapaSegundaNota ?? ''}-N${c.numeroSegundaNota ?? ''}: ${c.segundaNota ?? ''}`}</td>
                            <td>{c.descripcionConsecutivo || '-'}</td>
                            <td>
                              {c.estadoRiesgo === 'CRÍTICO' && <Badge bg="danger">CRÍTICO</Badge>}
                              {c.estadoRiesgo === 'ALTO' && <Badge bg="warning" text="dark">ALTO</Badge>}
                              {c.estadoRiesgo === 'MEDIO' && <Badge bg="info" text="dark">MEDIO</Badge>}
                              {!['CRÍTICO','ALTO','MEDIO'].includes(c.estadoRiesgo) && (c.estadoRiesgo || '-')}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* Recomendaciones */}
            {recomendaciones.length > 0 && (
              <Card>
                <Card.Header><strong>Recomendaciones</strong></Card.Header>
                <Card.Body className="p-0">
                  <ListGroup variant="flush">
                    {recomendaciones.map((rec, idx) => (<ListGroup.Item key={idx}>{rec}</ListGroup.Item>))}
                  </ListGroup>
                </Card.Body>
              </Card>
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
