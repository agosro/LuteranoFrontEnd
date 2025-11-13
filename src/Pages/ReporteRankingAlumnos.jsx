import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Accordion, Badge } from 'react-bootstrap';
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

  const exportCSV = () => {
    try {
      const lines = [];
      if (modo === 'colegio') {
        lines.push(['Puesto','Alumno','DNI','Curso','Promedio']);
        (rankingColegioItems || []).forEach((r, idx) => {
          const name = `${r.apellido || ''}, ${r.nombre || ''}`.trim();
          const curso = `${r.cursoAnio ?? ''} ${r.cursoDivision ?? ''}`.trim();
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
          const curso = `${cr?.cursoAnio ?? ''} ${cr?.cursoDivision ?? ''}`.trim() || cr?.cursoNombre || '';
          (cr?.ranking || []).forEach((r, idx) => {
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
      body { font-family: Arial, sans-serif; padding: 10px; }
      h3 { margin: 0 0 10px 0; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
    `;
    const sub = () => {
      if (modo === 'curso') return `Año: ${anio} · Curso: ${cursoNombre || cursoId}`;
      if (modo === 'colegio') return `Año: ${anio} · Ámbito: Colegio`;
      return `Año: ${anio} · Ámbito: Todos los cursos`;
    };
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ranking de Alumnos</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Ranking de Alumnos</h3>`);
    win.document.write(`<div class="sub">${sub()}</div>`);
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
                          <td>{`${r.cursoAnio ?? ''} ${r.cursoDivision ?? ''}`.trim()}</td>
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
                        <span><strong>{`${cr?.cursoAnio ?? ''} ${cr?.cursoDivision ?? ''}`.trim() || cr?.cursoNombre || 'Curso'}</strong></span>
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
                          {(cr?.ranking || []).length === 0 && (
                            <tr><td colSpan={4} className="text-center text-muted py-3">Sin datos</td></tr>
                          )}
                          {(cr?.ranking || []).map((r, jx) => (
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
