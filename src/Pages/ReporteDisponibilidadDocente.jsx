import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Card, Button, Form, Row, Col, Spinner, Alert, Table, Accordion } from "react-bootstrap";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import AsyncDocenteSelect from "../Components/Controls/AsyncDocenteSelect";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { obtenerDisponibilidadDocente } from "../Services/ReporteDisponibilidadService";

export default function ReporteDisponibilidadDocente() {
  const { user } = useAuth();
  const token = user?.token;
  const [searchParams] = useSearchParams();
  const autoGenerar = searchParams.get('auto') === 'true';
  const docenteIdFromUrl = searchParams.get('docenteId');

  const [docenteOpt, setDocenteOpt] = useState(null);
  const [docenteId, setDocenteId] = useState(docenteIdFromUrl || "");
  const [data, setData] = useState(null); // DocenteDisponibilidadDto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const printRef = useRef(null);

  // Mostrar horas sin segundos (HH:mm)
  const formatHM = useCallback((t) => {
    const s = String(t || '');
    const m = s.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : s;
  }, []);

  // Selector y búsqueda por DNI encapsulados en AsyncDocenteSelect

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    if (!docenteId) { setError("Seleccioná un docente"); return; }
    try {
      setLoading(true);
      const res = await obtenerDisponibilidadDocente(token, docenteId);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
      setData(res?.data || null);
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generar cuando viene de URL
  useEffect(() => {
    if (autoGenerar && docenteIdFromUrl && token && !data && !loading) {
      const generarAuto = async () => {
        setError("");
        setData(null);
        try {
          setLoading(true);
          const res = await obtenerDisponibilidadDocente(token, docenteIdFromUrl);
          if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
          setData(res?.data || null);
        } catch (err) {
          setError(err.message || "Error al generar reporte");
        } finally {
          setLoading(false);
        }
      };
      generarAuto();
    }
  }, [autoGenerar, docenteIdFromUrl, token, data, loading]);

  // Construir filas de horario a partir de agenda (union de bloques por (desde,hasta))
  const timeRows = useMemo(() => {
    const set = new Set();
    (data?.agenda || []).forEach(dia => {
      (dia?.bloques || []).forEach(b => {
        if (b?.horaDesde && b?.horaHasta) set.add(`${b.horaDesde}__${b.horaHasta}`);
      });
    });
    const arr = Array.from(set).map(k => {
      const [desde, hasta] = k.split('__');
      return { desde, hasta };
    });
    arr.sort((a,b) => a.desde.localeCompare(b.desde));
    return arr;
  }, [data]);

  const diasOrden = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
  const etiquetaDia = (d) => {
    const map = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado' };
    return map[d] || d;
  };

  const isOcupado = useCallback((diaKey, desde, hasta) => {
    const dia = (data?.agenda || []).find(x => String(x?.dia) === String(diaKey));
    if (!dia) return null;
    const bloque = (dia?.bloques || []).find(b => String(b?.horaDesde) === String(desde) && String(b?.horaHasta) === String(hasta));
    return bloque || null;
  }, [data]);

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!data || !data.agenda) return null;

    const totalBloques = timeRows.length * diasOrden.length;
    let bloquesOcupados = 0;
    const ocupacionPorDia = {};
    const materiasBloques = {};

    diasOrden.forEach(dia => {
      ocupacionPorDia[dia] = { total: timeRows.length, ocupados: 0 };
      timeRows.forEach(r => {
        const bloque = isOcupado(dia, r.desde, r.hasta);
        if (bloque) {
          bloquesOcupados++;
          ocupacionPorDia[dia].ocupados++;
          const materia = bloque.materiaNombre || 'Sin nombre';
          if (!materiasBloques[materia]) materiasBloques[materia] = 0;
          materiasBloques[materia]++;
        }
      });
    });

    const bloquesLibres = totalBloques - bloquesOcupados;
    const porcentajeOcupacion = totalBloques > 0 ? ((bloquesOcupados / totalBloques) * 100).toFixed(1) : 0;

    // Datos para gráfico de ocupación por día
    const ocupacionDiaData = diasOrden.map(dia => ({
      dia: etiquetaDia(dia),
      ocupados: ocupacionPorDia[dia].ocupados,
      libres: ocupacionPorDia[dia].total - ocupacionPorDia[dia].ocupados,
      total: ocupacionPorDia[dia].total
    }));

    // Datos para gráfico de pie (ocupados vs libres)
    const disponibilidadData = [
      { name: 'Ocupados', value: bloquesOcupados, color: '#dc3545' },
      { name: 'Libres', value: bloquesLibres, color: '#28a745' }
    ];

    // Datos para gráfico de materias
    const materiasData = Object.entries(materiasBloques)
      .map(([materia, bloques]) => ({ materia, bloques }))
      .sort((a, b) => b.bloques - a.bloques)
      .slice(0, 10);

    // Contar materias únicas y cursos únicos
    const materiasSet = new Set();
    const cursosSet = new Set();
    (data?.agenda || []).forEach(dia => {
      (dia?.bloques || []).forEach(b => {
        if (b?.materiaNombre) materiasSet.add(b.materiaNombre);
        const cursoLbl = `${b?.cursoAnio ?? ''} ${b?.cursoDivision ?? ''}`.trim();
        if (cursoLbl) cursosSet.add(cursoLbl);
      });
    });

    return {
      totalBloques,
      bloquesOcupados,
      bloquesLibres,
      porcentajeOcupacion,
      totalMaterias: materiasSet.size,
      totalCursos: cursosSet.size,
      ocupacionDiaData,
      disponibilidadData,
      materiasData
    };
  }, [data, timeRows, diasOrden, isOcupado]);

  const exportCSV = () => {
    const lines = [];
    lines.push(["Docente", `${data?.apellido || ''}, ${data?.nombre || ''}`.trim()]);
    lines.push(["DNI", data?.dni || '']);
    lines.push(["Año", new Date().getFullYear()]);
    lines.push([]);
    lines.push(["Hora", ...diasOrden.map(etiquetaDia)]);
    timeRows.forEach(r => {
      const row = [`${formatHM(r.desde)} a ${formatHM(r.hasta)}`];
      diasOrden.forEach(d => {
        const bloque = isOcupado(d, r.desde, r.hasta);
        if (bloque) {
          const materia = bloque.materiaNombre || '';
          const curso = `${bloque.cursoAnio ?? ''} ${bloque.cursoDivision ?? ''}`.trim();
          row.push(curso ? `${materia} (${curso})` : materia);
        } else {
          row.push('Libre');
        }
      });
      lines.push(row);
    });
    lines.push([]);
    // Materias por curso derivadas de la agenda
    const map = new Map();
    (data?.agenda || []).forEach(dia => {
      (dia?.bloques || []).forEach(b => {
        const materia = b?.materiaNombre;
        const cursoLbl = `${b?.cursoAnio ?? ''} ${b?.cursoDivision ?? ''}`.trim();
        if (materia) {
          if (!map.has(materia)) map.set(materia, new Set());
          if (cursoLbl) map.get(materia).add(cursoLbl);
        }
      });
    });
    const materiasCursos = Array.from(map.entries()).map(([materia, set]) => ({ materia, cursos: Array.from(set).sort() }));
    if (materiasCursos.length > 0) {
      lines.push(["Materia", "Cursos"]);
      materiasCursos.forEach(({ materia, cursos }) => {
        lines.push([materia, (cursos && cursos.length ? cursos.join(' | ') : '-')]);
      });
    } else {
      const mats = (data?.materias || []).join(', ');
      lines.push(["Materias", mats || '-']);
    }

    const csv = lines.map(cols => (Array.isArray(cols) ? cols : [cols])
      .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nombre = `${data?.apellido || ''}_${data?.nombre || ''}`.trim() || 'docente';
    a.download = `reporte_disponibilidad_${nombre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printAll = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      .kpi-section { margin: 0 0 16px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
      .kpi-card { padding: 8px; border: 1px solid #ccc; background: #fff; }
      .kpi-label { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; }
      .kpi-value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
      .card { border: 1px solid #ddd; margin-bottom: 12px; }
      .card-header { background: #f7f7f7; padding: 6px 8px; font-weight: 600; }
      .card-body { padding: 8px; }
      .small { font-size: 12px; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Disponibilidad Docente</title><style>${css}</style></head><body>`);
    
    // KPIs en PDF
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Bloques</div><div class="kpi-value">${kpisData.totalBloques}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Bloques Ocupados</div><div class="kpi-value">${kpisData.bloquesOcupados}</div><div style="font-size:10px;color:#666;">${kpisData.porcentajeOcupacion}% ocupación</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Bloques Libres</div><div class="kpi-value">${kpisData.bloquesLibres}</div><div style="font-size:10px;color:#666;">${(100 - kpisData.porcentajeOcupacion).toFixed(1)}% disponible</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Materias / Cursos</div><div class="kpi-value">${kpisData.totalMaterias}</div><div style="font-size:10px;color:#666;">${kpisData.totalCursos} cursos</div></div>`);
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
      <h2 className="mb-3">Disponibilidad Docente</h2>
      
      <p className="text-muted small mb-3">
        Este reporte muestra la disponibilidad horaria semanal de un docente, indicando los bloques ocupados y libres. 
        También incluye el detalle de las materias que dicta y los cursos asignados.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={9}>
                <Form.Label>Docente</Form.Label>
                <AsyncDocenteSelect
                  token={token}
                  value={docenteOpt}
                  onChange={(opt) => { setDocenteOpt(opt); setDocenteId(opt?.value || ""); }}
                  showDniSearch={true}
                />
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading || !docenteId}>
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
          {kpisData && (
            <Accordion className="mb-3 d-print-none">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BarChart3 size={20} className="me-2" />
                  <strong>KPIs y Gráficos de Disponibilidad</strong>
                </Accordion.Header>
                <Accordion.Body>
                  <Row className="g-3 mb-3">
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-primary">
                        <Card.Body>
                          <div className="text-primary mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Bloques</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalBloques}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-danger">
                        <Card.Body>
                          <div className="text-danger mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bloques Ocupados</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.bloquesOcupados}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{kpisData.porcentajeOcupacion}% ocupación</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-success">
                        <Card.Body>
                          <div className="text-success mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bloques Libres</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.bloquesLibres}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{(100 - kpisData.porcentajeOcupacion).toFixed(1)}% disponible</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col sm={12} md={6} lg={3}>
                      <Card className="h-100 border-info">
                        <Card.Body>
                          <div className="text-info mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Materias / Cursos</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpisData.totalMaterias}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{kpisData.totalCursos} cursos</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Gráficos */}
                  <Row className="g-3">
                    {/* Ocupación por día */}
                    <Col sm={12} lg={6}>
                      <Card className="h-100">
                        <Card.Header><strong>Ocupación por Día</strong></Card.Header>
                        <Card.Body>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={kpisData.ocupacionDiaData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="dia" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="ocupados" fill="#dc3545" name="Ocupados" stackId="a" />
                              <Bar dataKey="libres" fill="#28a745" name="Libres" stackId="a" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Distribución general (pie) */}
                    <Col sm={12} lg={6}>
                      <Card className="h-100">
                        <Card.Header><strong>Distribución de Disponibilidad</strong></Card.Header>
                        <Card.Body>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={kpisData.disponibilidadData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              >
                                {kpisData.disponibilidadData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Bloques por materia */}
                    {kpisData.materiasData.length > 0 && (
                      <Col sm={12}>
                        <Card>
                          <Card.Header><strong>Bloques por Materia</strong></Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={Math.max(300, kpisData.materiasData.length * 40)}>
                              <BarChart data={kpisData.materiasData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="materia" width={150} />
                                <Tooltip />
                                <Bar dataKey="bloques" fill="#17a2b8" name="Cantidad de bloques" />
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
            <Button variant="outline-secondary" size="sm" onClick={exportCSV}>Exportar CSV</Button>
            <Button variant="outline-secondary" size="sm" onClick={printAll}>Imprimir / PDF</Button>
          </div>

          <div ref={printRef}>
            {/* Encabezado estilo planilla */}
            <Card className="mb-3">
              <Card.Body>
                <table className="table table-bordered table-sm mb-0">
                  <tbody>
                    <tr>
                      <td><strong>ESCUELA:</strong> Colegio Luterano de Concordia</td>
                      <td className="text-end">Año: {new Date().getFullYear()}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        Docente: <strong>{data?.apellido || '-'} {data?.nombre || '-'}</strong>
                        &nbsp;&nbsp; DNI: <strong>{data?.dni || '-'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-center fw-semibold mt-2">DISPONIBILIDAD HORARIA DOCENTE</div>
              </Card.Body>
            </Card>

            {/* Tabla de disponibilidad */}
            <Card className="mb-3">
              <Card.Header>Horarios de prestación</Card.Header>
              <Card.Body className="p-0">
                <Table bordered responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      {diasOrden.map(d => (<th key={d}>{etiquetaDia(d)}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeRows.length === 0 && (
                      <tr><td colSpan={1 + diasOrden.length} className="text-center text-muted py-3">Sin datos</td></tr>
                    )}
                    {timeRows.map((r, idx) => (
                      <tr key={idx}>
                        <td>{formatHM(r.desde)} a {formatHM(r.hasta)}</td>
                        {diasOrden.map(d => {
                          const bloque = isOcupado(d, r.desde, r.hasta);
                          if (bloque) {
                            const materia = bloque.materiaNombre || 'Ocupado';
                            const curso = `${bloque.cursoAnio ?? ''} ${bloque.cursoDivision ?? ''}`.trim();
                            return (
                              <td key={d} className="table-danger" style={{ fontSize: '0.85rem', padding: '4px' }}>
                                <strong>{materia}</strong>
                                {curso && <><br/><span className="text-muted small">({curso})</span></>}
                              </td>
                            );
                          }
                          return (
                            <td key={d} className="table-success">
                              Libre
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* Materias dictadas */}
            <Card>
              <Card.Header>Materias que dicta</Card.Header>
              <Card.Body>
                {(() => {
                  const map = new Map();
                  (data?.agenda || []).forEach(dia => {
                    (dia?.bloques || []).forEach(b => {
                      const materia = b?.materiaNombre;
                      const cursoLbl = `${b?.cursoAnio ?? ''} ${b?.cursoDivision ?? ''}`.trim();
                      if (materia) {
                        if (!map.has(materia)) map.set(materia, new Set());
                        if (cursoLbl) map.get(materia).add(cursoLbl);
                      }
                    });
                  });
                  const items = Array.from(map.entries()).map(([materia, set]) => ({ materia, cursos: Array.from(set).sort() }))
                    .sort((a,b) => (a.materia||'').localeCompare(b.materia||''));
                  if (items.length === 0) {
                    return <div>{(data?.materias || []).length ? data.materias.join(', ') : '-'}</div>;
                  }
                  return (
                    <ul className="mb-0">
                      {items.map((it, idx) => (
                        <li key={idx}>
                          <strong>{it.materia}:</strong> {it.cursos.length ? it.cursos.join(', ') : '-'}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </Card.Body>
            </Card>
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
