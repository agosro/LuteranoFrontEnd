import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext.jsx';
import { useCicloLectivo } from '../Context/CicloLectivoContext.jsx';
import { crearCicloLectivoManual, crearSiguienteCicloLectivo, listarCiclosLectivos } from '../Services/CicloLectivoService.js';

export default function ConfiguracionCicloLectivo() {
  const { user } = useAuth();
  const { cicloLectivo, setCicloLectivo } = useCicloLectivo();

  const [ciclos, setCiclos] = useState([]); // [{id, nombre}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingNext, setCreatingNext] = useState(false);
  const [anioManual, setAnioManual] = useState('');
  const [creatingManual, setCreatingManual] = useState(false);
  const [selectedId, setSelectedId] = useState(cicloLectivo?.id || '');

  const isAdminOrDirector = useMemo(() => ['ROLE_ADMIN', 'ROLE_DIRECTOR'].includes(user?.rol), [user]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await listarCiclosLectivos(user.token);
        // Ordenamos por nombre descendente si es año
        const ordered = [...list].sort((a, b) => {
          const na = parseInt(a.nombre, 10);
          const nb = parseInt(b.nombre, 10);
          if (!isNaN(na) && !isNaN(nb)) return nb - na; // años desc
          return String(b.nombre).localeCompare(String(a.nombre));
        });
        setCiclos(ordered);
        // Si no hay seleccionado, podemos setear el más reciente
        if (!cicloLectivo && ordered.length > 0) {
          setSelectedId(ordered[0].id);
        }
      } catch (err) {
        toast.error(err.message || 'Error al cargar ciclos lectivos');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cicloLectivo?.id) setSelectedId(cicloLectivo.id);
  }, [cicloLectivo]);

  const onGuardarSeleccion = () => {
    const sel = ciclos.find(c => String(c.id) === String(selectedId));
    if (!sel) {
      toast.warn('Seleccioná un ciclo lectivo');
      return;
    }
    setSaving(true);
    try {
      setCicloLectivo({ id: sel.id, nombre: sel.nombre });
      toast.success(`Ciclo lectivo seleccionado: ${sel.nombre}`);
    } finally {
      setSaving(false);
    }
  };

  const onCrearSiguiente = async () => {
    if (!isAdminOrDirector) return;
    try {
      setCreatingNext(true);
      const res = await crearSiguienteCicloLectivo(user.token);
      toast.success(res.mensaje || 'Ciclo lectivo creado');
      // refrescar lista
      const list = await listarCiclosLectivos(user.token);
      setCiclos(list);
      // seleccionar si corresponde el mayor año
      const newest = [...list].sort((a, b) => String(b.nombre).localeCompare(String(a.nombre)))[0];
      if (newest) {
        setSelectedId(newest.id);
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo crear el siguiente ciclo');
    } finally {
      setCreatingNext(false);
    }
  };

  const onCrearManual = async () => {
    if (!isAdminOrDirector) return;
    const anio = parseInt(anioManual, 10);
    if (isNaN(anio) || anio <= 0) {
      toast.warn('Ingresá un año válido (> 0)');
      return;
    }
    try {
      setCreatingManual(true);
      const res = await crearCicloLectivoManual(user.token, anio);
      toast.success(res.mensaje || `Ciclo ${anio} creado`);
      const list = await listarCiclosLectivos(user.token);
      setCiclos(list);
      const created = list.find(c => String(c.nombre) === String(anio));
      if (created) setSelectedId(created.id);
    } catch (err) {
      toast.error(err.message || 'No se pudo crear el ciclo manualmente');
    } finally {
      setCreatingManual(false);
    }
  };

  return (
    <div className="container mt-4">
      <Row>
        <Col md={12}>
          <h3 className="mb-3">Ciclo lectivo</h3>
           <p className="text-muted mb-4">
             Gestioná los ciclos lectivos activos y creá nuevos años escolares para la institución.
           </p>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="mb-3">Seleccionar ciclo lectivo activo</Card.Title>
              {loading ? (
                <div className="d-flex align-items-center gap-2">
                  <Spinner size="sm" /> Cargando ciclos...
                </div>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Ciclos disponibles</Form.Label>
                    <Form.Select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                    >
                      <option value="">-- Seleccioná --</option>
                      {ciclos.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={onGuardarSeleccion} disabled={saving || !selectedId}>
                      {saving ? <Spinner size="sm" as="span" className="me-2" /> : null}
                      Guardar selección
                    </Button>
                    {cicloLectivo ? (
                      <div className="text-muted d-flex align-items-center">
                        Actual: <strong className="ms-1">{cicloLectivo.nombre}</strong>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="mb-3">Gestionar ciclos lectivos</Card.Title>
              <div className="d-flex flex-column gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={onCrearSiguiente}
                  disabled={!isAdminOrDirector || creatingNext}
                >
                  {creatingNext ? <Spinner size="sm" as="span" className="me-2" /> : null}
                  Crear ciclo del año siguiente
                </Button>

                <InputGroup>
                  <InputGroup.Text>Año</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={1}
                    placeholder="Ej: 2026"
                    value={anioManual}
                    onChange={(e) => setAnioManual(e.target.value)}
                    disabled={!isAdminOrDirector}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={onCrearManual}
                    disabled={!isAdminOrDirector || creatingManual}
                  >
                    {creatingManual ? <Spinner size="sm" as="span" className="me-2" /> : null}
                    Crear manualmente
                  </Button>
                </InputGroup>
                {!isAdminOrDirector && (
                  <div className="text-muted small">
                    Solo ADMIN o DIRECTOR pueden crear nuevos ciclos.
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
