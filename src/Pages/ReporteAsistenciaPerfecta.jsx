import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Form, Row, Col, Spinner, Alert, Table, Badge } from "react-bootstrap";
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
      (row?.alumnos || []).forEach(a => {
        out.push({
          id: a?.id,
          nombre: `${a?.apellido || ''}, ${a?.nombre || ''}`.trim(),
          dni: a?.dni || '',
          cursoEtiqueta: etiqueta,
          nivel: curso?.nivel || ''
        });
      });
    });
    // ordenar por curso y apellido
    out.sort((x,y) => (x.cursoEtiqueta||'').localeCompare(y.cursoEtiqueta||'') || (x.nombre||'').localeCompare(y.nombre||''));
    return out;
  }, [cursosFiltradosTodos]);

  const alumnosCurso = useMemo(() => {
    if (!cursoId) return [];
    const row = (cursos || []).find(r => String(r?.curso?.id || '') === String(cursoId));
    const curso = row?.curso || {};
    const etiqueta = `${curso?.anio || ''} ${curso?.division || ''}`.trim();
    const lista = (row?.alumnos || []).map(a => ({
      id: a?.id,
      nombre: `${a?.apellido || ''}, ${a?.nombre || ''}`.trim(),
      dni: a?.dni || '',
      cursoEtiqueta: etiqueta,
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
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
      .card { border: 1px solid #ddd; margin-bottom: 12px; }
      .card-header { background: #f7f7f7; padding: 6px 8px; font-weight: 600; }
      .card-body { padding: 8px; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Asistencia Perfecta</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Asistencia Perfecta - Año ${data?.anio ?? anio}</h3>`);
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
                <Col md={4} className="d-flex align-items-end">
                  <Form.Check
                    type="switch"
                    id="soloPerfectosSwitch"
                    label="Mostrar solo cursos con perfectos"
                    checked={soloConPerfectos}
                    onChange={(e) => setSoloConPerfectos(e.target.checked)}
                  />
                </Col>
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
          {/* Acciones */}
          <div className="d-flex justify-content-end gap-2 mb-3">
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
                        <th className="d-print-none">Acciones</th>
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
                          <td className="d-print-none">
                            <Button size="sm" variant="outline-primary" onClick={() => navigate(`/alumno/${a?.id}`)}>
                              Ver detalle
                            </Button>
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
