import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Row, Col, Form, Button, Table, Spinner, Alert, Badge } from "react-bootstrap";
import { useAuth } from "../Context/AuthContext";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { resumenNotasCursoPorAnio } from "../Services/ReporteNotasService";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import Estadisticas from "../Components/Reportes/Estadisticas";

// Esta página implementa el reporte estilo R3 del documento: muestra por curso y materia,
// calificaciones por etapa (4 columnas por etapa), E1/E2 promedios, PG, PFA (uso PG), Estado.

export default function ReporteNotasCursoMateria() {
  const { user } = useAuth();
  const token = user?.token;

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState("Todos"); // E1, E2, Todos
  const [cursoId, setCursoId] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  // Cargar cursos según rol
  useEffect(() => {
    let active = true;
    async function loadCursos() {
      try {
        setError("");
        let lista = [];
        if (user?.rol === "ROLE_DOCENTE" && user?.docenteId) {
          lista = await listarCursosPorDocente(token, user.docenteId);
        } else if (user?.rol === "ROLE_PRECEPTOR" && user?.preceptorId) {
          lista = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          lista = await listarCursos(token);
        }
        if (active) setCursos(lista);
      } catch (e) {
        if (active) setError(e.message || "Error al cargar cursos");
      }
    }
    if (token) loadCursos();
    return () => { active = false; };
  }, [token, user]);

  // Cargar materias al seleccionar curso
  useEffect(() => {
    let active = true;
    async function loadMaterias() {
      try {
        setMaterias([]);
        setMateriaId("");
        if (!cursoId) return;
        const lista = await listarMateriasDeCurso(token, cursoId);
        if (active) setMaterias(lista);
      } catch (e) {
        if (active) setError(e.message || "Error al cargar materias");
      }
    }
    if (token) loadMaterias();
    return () => { active = false; };
  }, [token, cursoId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    if (!cursoId) { setError("Seleccioná un curso"); return; }
    try {
      setLoading(true);
      // Traemos todo el curso; luego filtramos materia si está elegida
  const res = await resumenNotasCursoPorAnio(token, cursoId, anio);
      setData(res);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const collator = useMemo(() => new Intl.Collator("es-AR", { sensitivity: "base" }), []);
  const alumnos = useMemo(() => {
    let list = data?.alumnos || [];
    if (materiaId) {
      list = list.map(a => ({
        ...a,
        materias: (a.materias || []).filter(m => String(m.materiaId) === String(materiaId))
      }));
    }
    // Orden por apellido, nombre
    return list.sort((a,b) => {
      const ap = collator.compare(a.apellido || "", b.apellido || "");
      if (ap !== 0) return ap;
      return collator.compare(a.nombre || "", b.nombre || "");
    });
  }, [data, materiaId, collator]);

  const materiasCurso = materias.map(m => ({ id: m.materiaId ?? m.id, nombre: m.nombreMateria ?? m.nombre }));

  // Estadísticas rápidas del curso (sobre filas visibles)
  const filas = useMemo(() => {
    const list = [];
    for (const a of alumnos) {
      for (const m of a.materias || []) {
        list.push({ alumno: a, m });
      }
    }
    return list;
  }, [alumnos]);

  const pgList = filas.map(f => f.m.pg).filter(v => typeof v === 'number');
  const totalFilas = filas.length; // alumno-materia visibles
  const aprobadas = filas.filter(f => (f.m.pg ?? 0) >= 6).length;
  const desaprobadas = totalFilas - aprobadas;
  const promedioGeneralCurso = pgList.length ? Math.round((pgList.reduce((a,b)=>a+b,0)/pgList.length)*10)/10 : null;

  const e1Cols = periodo !== 'E2' ? 5 : 0;
  const e2Cols = periodo !== 'E1' ? 5 : 0;
  const totalCols = 4 + e1Cols + e2Cols + 5; // 4 fijos izq + grupos + 5 (PG,CO,EX,PFA,Estado)

  const printOnlyTable = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Notas</title><style>${css}</style></head><body>`);
    const titulo = `${data?.curso?.nombre || 'Curso'} · Año ${data?.anio || anio}${materiaId ? ' · Materia: ' + (materiasCurso.find(x=>String(x.id)===String(materiaId))?.nombre||'') : ''}`;
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const exportCSV = () => {
    if (!alumnos || alumnos.length === 0) return;
    const header = ["Nro Doc","Apellido","Nombre","Materia","E1 N1","E1 N2","E1 N3","E1 N4","E1","E2 N1","E2 N2","E2 N3","E2 N4","E2","PG","Estado"];
    const rows = [];
    for (const a of alumnos) {
      const mats = a.materias || [];
      if (mats.length === 0) rows.push([a.dni||"", a.apellido||"", a.nombre||"", "", "","","","","","","","","","","",""]);
      for (const m of mats) {
        const e1 = m.e1Notas || [];
        const e2 = m.e2Notas || [];
        rows.push([
          a.dni||"", a.apellido||"", a.nombre||"",
          m.materiaNombre||"",
          e1[0]??"", e1[1]??"", e1[2]??"", e1[3]??"",
          m.e1??"",
          e2[0]??"", e2[1]??"", e2[2]??"", e2[3]??"",
          m.e2??"",
          m.pg??"",
          m.estado??""
        ]);
      }
    }
    const csv = [header, ...rows].map(r => r.map(v => '"' + String(v ?? "").replace(/"/g,'""') + '"').join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_notas_curso_${data?.curso?.nombre || cursoId}_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-3">Notas por Curso y Materia</h2>
      <Card className="mb-3">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                  <option value="">Seleccioná un curso</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre || `${c.anio || ''} ${c.division || ''} ${c.nivel || ''}`}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Materia (opcional)</Form.Label>
                <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)} disabled={!cursoId}>
                  <option value="">Todas</option>
                  {materiasCurso.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Año</Form.Label>
                <Form.Select value={anio} onChange={(e)=>setAnio(e.target.value)}>
                  {[-1,0,1].map(off => {
                    const y = new Date().getFullYear() + off; return <option key={y} value={y}>{y}</option>;
                  })}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Período</Form.Label>
                <Form.Select value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="E1">Etapa 1</option>
                  <option value="E2">Etapa 2</option>
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading}>{loading ? <><Spinner size="sm" animation="border" className="me-2"/>Generando...</> : "Generar"}</Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && data && !error && (
        <Card>
          <Card.Body>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
              <div>
                <h5 className="mb-1">{data?.curso?.nombre || "Curso"} · Año {data?.anio}</h5>
                <div className="text-muted small">Total de alumnos: {data?.total}</div>
              </div>
              <div className="mt-2 mt-md-0">
                <Button className="me-2" size="sm" variant="outline-secondary" onClick={exportCSV}>Exportar CSV</Button>
                <Button size="sm" variant="outline-secondary" onClick={printOnlyTable}>Imprimir / PDF (solo tabla)</Button>
              </div>
            </div>
            {/* Estadísticas rápidas */}
            <div className="mb-3">
              <Estadisticas
                items={[
                  { label: "Filas (alumno·materia)", value: totalFilas },
                  { label: "Aprobadas", value: aprobadas, variant: "success" },
                  { label: "Desaprobadas", value: desaprobadas, variant: "danger" },
                  { label: "Promedio General", value: promedioGeneralCurso ?? "-" },
                ]}
              />
            </div>

            {/* Tabla principal estilo R3 */}
            <div ref={printRef}>
            <Table striped bordered hover responsive size="sm">
              <thead>
                <tr>
                  <th>Nro Doc</th>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th>Materia</th>
                  {periodo !== 'E2' && <th colSpan={5} className="text-center">Calificaciones Etapa 1</th>}
                  {periodo !== 'E1' && <th colSpan={5} className="text-center">Calificaciones Etapa 2</th>}
                  <th>PG</th>
                  <th>CO</th>
                  <th>EX</th>
                  <th>PFA</th>
                  <th>Estado</th>
                </tr>
                <tr>
                  <th colSpan={4}></th>
                  {periodo !== 'E2' && (<>
                    <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                  </>)}
                  {periodo !== 'E1' && (<>
                    <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                  </>)}
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alumnos.length === 0 && (
                  <tr><td colSpan={totalCols} className="text-center text-muted">Sin datos</td></tr>
                )}
                {alumnos.map((a, idxA) => {
                  const mats = a.materias || [];
                  if (mats.length === 0) {
                    return (
                      <tr key={`a-${idxA}`}>
                        <td>{a.dni||""}</td>
                        <td>{a.apellido||""}</td>
                        <td>{a.nombre||""}</td>
                        <td colSpan={e1Cols + e2Cols} className="text-muted">Sin materias para filtros seleccionados</td>
                        <td></td><td></td><td></td><td></td><td></td>
                      </tr>
                    );
                  }
                  return mats.map((m, idxM) => {
                    const e1 = m.e1Notas || [];
                    const e2 = m.e2Notas || [];
                    return (
                      <tr key={`a-${idxA}-m-${idxM}`}>
                        <td>{a.dni||""}</td>
                        <td>{a.apellido||""}</td>
                        <td>{a.nombre||""}</td>
                        <td>{m.materiaNombre||""}</td>
                        {periodo !== 'E2' && (<>
                          <td>{e1[0]??"-"}</td><td>{e1[1]??"-"}</td><td>{e1[2]??"-"}</td><td>{e1[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e1??"-"}</Badge></td>
                        </>)}
                        {periodo !== 'E1' && (<>
                          <td>{e2[0]??"-"}</td><td>{e2[1]??"-"}</td><td>{e2[2]??"-"}</td><td>{e2[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e2??"-"}</Badge></td>
                        </>)}
                        <td><Badge bg={m.pg>=6?"success":"danger"}>{m.pg??"-"}</Badge></td>
                        <td></td>
                        <td></td>
                        <td>{m.pg ?? "-"}</td>
                        <td>{m.estado??"-"}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
