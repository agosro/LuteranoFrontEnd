import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, Button, Form, Row, Col, Spinner, Alert, Table } from "react-bootstrap";
import AsyncSelect from "react-select/async";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";
import { listarDocentes } from "../Services/DocenteService";
import { obtenerDisponibilidadDocente } from "../Services/ReporteDisponibilidadService";

export default function ReporteDisponibilidadDocente() {
  const { user } = useAuth();
  const token = user?.token;

  const [docenteOpt, setDocenteOpt] = useState(null);
  const [docenteId, setDocenteId] = useState("");
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

  const loadDocenteOptions = useCallback(async (inputValue) => {
    try {
      const lista = await listarDocentes(token);
      const q = (inputValue || "").toLowerCase();
      const filtered = (lista || []).filter(d => {
        const n = `${d.apellido || ''} ${d.nombre || ''}`.toLowerCase();
        const dni = String(d.dni || '');
        return !q || n.includes(q) || dni.includes(q);
      }).slice(0, 200);
      return filtered.map(d => ({ value: d.id, label: `${d.apellido || ''}, ${d.nombre || ''}${d.dni ? ' - ' + d.dni : ''}`.trim(), raw: d }));
    } catch {
      return [];
    }
  }, [token]);

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

  const isOcupado = (diaKey, desde, hasta) => {
    const dia = (data?.agenda || []).find(x => String(x?.dia) === String(diaKey));
    if (!dia) return false;
    return (dia?.bloques || []).some(b => String(b?.horaDesde) === String(desde) && String(b?.horaHasta) === String(hasta));
  };

  const exportCSV = () => {
    const lines = [];
    lines.push(["Docente", `${data?.apellido || ''}, ${data?.nombre || ''}`.trim()]);
    lines.push(["DNI", data?.dni || '']);
    lines.push(["Año", new Date().getFullYear()]);
    lines.push([]);
    lines.push(["Hora", ...diasOrden.map(etiquetaDia)]);
    timeRows.forEach(r => {
      const row = [`${formatHM(r.desde)} a ${formatHM(r.hasta)}`];
      diasOrden.forEach(d => row.push(isOcupado(d, r.desde, r.hasta) ? 'Ocupado' : 'Libre'));
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
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead th { background: #f0f0f0; }
      .card { border: 1px solid #ddd; margin-bottom: 12px; }
      .card-header { background: #f7f7f7; padding: 6px 8px; font-weight: 600; }
      .card-body { padding: 8px; }
      .small { font-size: 12px; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Disponibilidad Docente</title><style>${css}</style></head><body>`);
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

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Docente</Form.Label>
                <AsyncSelect
                  cacheOptions={false}
                  defaultOptions={true}
                  loadOptions={loadDocenteOptions}
                  value={docenteOpt}
                  onChange={(opt) => { setDocenteOpt(opt); setDocenteId(opt?.value || ""); }}
                  placeholder="Seleccioná un docente o escribí para filtrar"
                  isClearable
                  classNamePrefix="select"
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
          {/* Acciones */}
          <div className="d-flex justify-content-end gap-2 mb-3">
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
                          const ocupado = isOcupado(d, r.desde, r.hasta);
                          return (
                            <td key={d} className={ocupado ? 'table-danger' : 'table-success'}>
                              {ocupado ? 'Ocupado' : 'Libre'}
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
