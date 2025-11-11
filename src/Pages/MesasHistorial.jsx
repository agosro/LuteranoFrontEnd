import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../Context/AuthContext.jsx';
import { listarCursos } from '../Services/CursoService.js';
import { listarMesasPorCurso } from '../Services/MesaExamenService.js';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService.js';
import { Container, Card, Table, Spinner, Row, Col, Form, Badge, Button, Alert } from 'react-bootstrap';
import Paginacion from '../Components/Botones/Paginacion.jsx';
import Breadcrumbs from '../Components/Botones/Breadcrumbs.jsx';
import BackButton from '../Components/Botones/BackButton.jsx';
import { toast } from 'react-toastify';

export default function MesasHistorial() {
  const { user } = useAuth();
  const token = user?.token;
  const thisYear = new Date().getFullYear();
  const [cursos, setCursos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: null, text: '' });

  // Filtros
  const [filtroYear, setFiltroYear] = useState(''); // '' = todos históricos
  const [filtroCursoId, setFiltroCursoId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMateriaSel, setFiltroMateriaSel] = useState(''); // nombre exacto
  const [materiaOpciones, setMateriaOpciones] = useState([]); // nombres
  // Paginación
  const [pagina, setPagina] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      try {
        const c = await listarCursos(token);
        setCursos(c);
      } catch (e) { toast.error(e.message); }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Cargamos mesas de todos los cursos (historial puede ser grande)
        const allMesas = [];
        for (const c of cursos) {
          try {
            const m = await listarMesasPorCurso(token, c.id);
            m.forEach(x => allMesas.push({ ...x, curso: c }));
          } catch { /* ignorar cursos con error individual */ }
        }
        setMesas(allMesas);
      } catch (e) {
        setMsg({ type: 'danger', text: e.message });
        toast.error(e.message);
      } finally { setLoading(false); }
    })();
  }, [cursos, token]);

  // Opciones del select de Materia: si hay curso seleccionado, cargar materias de ese curso;
  // si no, usar todos los nombres de materia presentes en el listado actual.
  useEffect(() => {
    (async () => {
      try {
        if (filtroCursoId) {
          const mats = await listarMateriasDeCurso(token, filtroCursoId);
          const names = Array.from(new Set((mats||[]).map(mt => String(mt.nombreMateria||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
          setMateriaOpciones(names);
        } else {
          const names = Array.from(new Set((mesas||[]).map(m => String(m.materiaNombre||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
          setMateriaOpciones(names);
        }
      } catch {
        setMateriaOpciones([]);
      }
    })();
  }, [filtroCursoId, mesas, token]);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const [y,m,d] = String(iso).split('-');
    if (!y||!m||!d) return iso;
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  };

  const mesasFiltradas = useMemo(() => {
    return mesas.filter(m => {
      // Solo historial: incluye mesas de años anteriores cualquier estado
      // y mesas del año actual que estén FINALIZADAS hace más de 14 días.
      const [yStr] = String(m.fecha || '').split('-');
      const anio = Number(yStr);
      const hoy = new Date();
      let enHistorial = false;
      if (anio && anio < thisYear) {
        enHistorial = true;
      } else if (anio === thisYear && m.estado === 'FINALIZADA') {
        const [y,mm,d] = String(m.fecha).split('-').map(Number);
        if (y&&mm&&d) {
          const fechaMesa = new Date(y, mm-1, d);
          const diffMs = hoy - fechaMesa;
          const dias = diffMs / (1000*60*60*24);
          if (dias > 14) enHistorial = true;
        }
      }
      if (!enHistorial) return false;
      if (filtroYear) {
        if (filtroYear === 'ACTUAL') {
          // mostrar solo las que son del año actual y cumplen criterio historial (finalizadas >14d)
          if (anio !== thisYear) return false;
        } else {
          if (anio !== Number(filtroYear)) return false;
        }
      }
      if (filtroCursoId && Number(filtroCursoId) !== Number(m.curso?.id)) return false;
      if (filtroEstado && m.estado !== filtroEstado) return false;
      if (filtroMateriaSel && String(m.materiaNombre || '').trim() !== filtroMateriaSel) return false;
      return true;
    });
  }, [mesas, filtroYear, filtroCursoId, filtroEstado, filtroMateriaSel, thisYear]);

  const totalPaginas = Math.max(1, Math.ceil(mesasFiltradas.length / pageSize));
  const items = mesasFiltradas.slice((pagina - 1) * pageSize, pagina * pageSize);
  const onPaginaChange = (p) => setPagina(Math.max(1, Math.min(totalPaginas, p)));

  const yearsDisponibles = useMemo(() => {
    const set = new Set();
    mesas.forEach(m => {
      const [yStr] = String(m.fecha || '').split('-');
      const anio = Number(yStr);
      if (anio) set.add(anio);
    });
    return Array.from(set).sort((a,b)=>b-a);
  }, [mesas]);

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Historial de Mesas de Examen</h3>
          <p className="text-muted">Mesas de años anteriores y mesas finalizadas del año actual con más de 14 días.</p>
          {msg.type && (
            <Row className="mb-3"><Col><Alert variant={msg.type} onClose={()=>setMsg({type:null,text:''})} dismissible>{msg.text}</Alert></Col></Row>
          )}
          {/* Filtros */}
          <Row className="g-3 mb-3">
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Select value={filtroYear} onChange={(e)=> { setFiltroYear(e.target.value); setPagina(1); }}>
                  <option value="">Todos</option>
                  <option value="ACTUAL">{thisYear} (finalizadas {'>'}14d)</option>
                  {yearsDisponibles.filter(y=> y < thisYear).map(y => <option key={y} value={y}>{y}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={filtroCursoId} onChange={(e)=> { setFiltroCursoId(e.target.value); setPagina(1); }}>
                  <option value="">Todos</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{`${c.anio ?? ''}°${c.division ?? ''}`}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select value={filtroEstado} onChange={(e)=> { setFiltroEstado(e.target.value); setPagina(1); }}>
                  <option value="">Todos</option>
                  <option value="CREADA">Creada</option>
                  <option value="FINALIZADA">Finalizada</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Materia</Form.Label>
                <Form.Select value={filtroMateriaSel} onChange={(e)=> { setFiltroMateriaSel(e.target.value); setPagina(1); }}>
                  <option value="">Todas</option>
                  {materiaOpciones.map(n => <option key={n} value={n}>{n}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md="auto" className="d-flex align-items-end">
              <Button variant="secondary" onClick={()=>{ setFiltroYear(''); setFiltroCursoId(''); setFiltroEstado(''); setFiltroMateriaSel(''); setPagina(1); }}>Limpiar</Button>
            </Col>
          </Row>

          {loading ? <div className="p-3"><Spinner animation="border" /></div> : (
            <>
            <Table striped hover responsive size="sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Año</th>
                  <th>Curso</th>
                  <th>Materia</th>
                  <th>Estado</th>
                  <th>Convocados</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => {
                  const [yStr] = String(m.fecha || '').split('-');
                  return (
                    <tr key={m.id}>
                      <td>{fmtDate(m.fecha)}</td>
                      <td>{yStr || '-'}</td>
                      <td>{m.curso ? `${m.curso.anio ?? ''}°${m.curso.division ?? ''}` : '-'}</td>
                      <td>{m.materiaNombre || '-'}</td>
                      <td>{m.estado === 'FINALIZADA' ? <Badge bg="secondary">Finalizada</Badge> : <Badge bg="success">Creada</Badge>}</td>
                      <td>{Array.isArray(m.alumnos) ? m.alumnos.length : 0}</td>
                    </tr>
                  );
                })}
                {mesasFiltradas.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Sin resultados para los filtros aplicados</td></tr>
                )}
              </tbody>
            </Table>
            {mesasFiltradas.length > 0 && (
              <div className="mt-3">
                <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onPaginaChange={onPaginaChange} />
              </div>
            )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
