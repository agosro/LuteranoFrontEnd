import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Spinner, Table, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { ejecutarPromocionMasiva, simularPromocionMasiva } from '../Services/PromocionMasivaService';
import ConfirmarAccion from '../Components/Modals/ConfirmarAccion';
import { useCicloLectivo } from '../Context/CicloLectivoContext.jsx';

export default function PromocionMasiva() {
  const { user } = useAuth();
  const token = user?.token;
  const rol = user?.rol;
  const { cicloLectivo } = useCicloLectivo();
  const anioActual = new Date().getFullYear();

  const [form, setForm] = useState({
    anio: anioActual,
    cicloLectivoId: 0,
    cicloLectivoNombre: '',
    maxRepeticiones: 2,
    dryRun: false,
  });

  // Sincronizar ciclo desde contexto
  useEffect(() => {
    if (cicloLectivo?.id) {
      setForm((v) => ({
        ...v,
        cicloLectivoId: Number(cicloLectivo.id),
        cicloLectivoNombre: cicloLectivo.nombre || '',
      }));
    }
  }, [cicloLectivo?.id, cicloLectivo?.nombre]);

  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [modoEjecucion, setModoEjecucion] = useState(''); // 'simular' | 'ejecutar'

  const puedeEjecutarReal = rol === 'ROLE_ADMIN' || rol === 'ROLE_DIRECTOR';

  const handleChange = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((v) => ({ ...v, [field]: e?.target?.type === 'number' ? Number(value) : value }));
  };

  const submit = async (modo) => {
    // modo: 'simular' | 'ejecutar'
    setCargando(true);
    setResultado(null);
    setTiempoTranscurrido(0);
    setModoEjecucion(modo);
    
    // Iniciar contador de tiempo
    const startTime = Date.now();
    const intervalo = setInterval(() => {
      setTiempoTranscurrido(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    try {
      // Validaciones mínimas
      const anio = Number(form.anio);
      const cicloId = Number(form.cicloLectivoId);
      if (!cicloId) {
        toast.error('Debe indicar un ciclo lectivo');
        setCargando(false);
        return;
      }
      const payload = {
        anio: anio,
        cicloLectivoId: cicloId,
        maxRepeticiones: Math.min(5, Math.max(1, Number(form.maxRepeticiones) || 2)),
        dryRun: !!form.dryRun,
      };

      let resp;
      if (modo === 'simular') {
        resp = await simularPromocionMasiva(token, { ...payload, dryRun: true });
        toast.success('Simulación ejecutada');
      } else {
        if (!puedeEjecutarReal) {
          toast.error('No tenés permisos para ejecutar la promoción real');
          setCargando(false);
          return;
        }
        resp = await ejecutarPromocionMasiva(token, { ...payload, dryRun: false });
        toast.success('Promoción masiva ejecutada');
      }
      setResultado(resp);
    } catch (e) {
      toast.error(e?.message || 'Error al procesar promoción');
    } finally {
      clearInterval(intervalo);
      setCargando(false);
      setModoEjecucion('');
    }
  };

  const resumen = useMemo(() => {
    const r = resultado || {};
    return {
      procesados: r.procesados ?? 0,
      promocionados: r.promocionados ?? 0,
      repitentes: r.repitentes ?? 0,
      egresados: r.egresados ?? 0,
      excluidos: r.excluidos ?? 0,
      noProcesados: r.noProcesados ?? 0,
      dryRun: !!r.dryRun,
      mensaje: r.mensaje || '',
      code: typeof r.code === 'number' ? r.code : 0,
      lista: Array.isArray(r.resumen) ? r.resumen : [],
    };
  }, [resultado]);

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Promoción masiva de alumnos</h3>
           <p className="text-muted mb-4">
             Ejecutá la promoción o simulación de todos los alumnos del ciclo lectivo seleccionado según las reglas académicas vigentes.
           </p>

          <Row className="g-3 align-items-end">
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Control type="number" value={form.anio} disabled />
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Ciclo lectivo</Form.Label>
                <Form.Control type="text" value={form.cicloLectivoNombre} disabled />
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Máx. repeticiones</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={5}
                  value={form.maxRepeticiones}
                  disabled={cargando}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const clamped = Number.isNaN(n) ? 1 : Math.min(5, Math.max(1, Math.floor(n)));
                    setForm((v) => ({ ...v, maxRepeticiones: clamped }));
                  }}
                />
              </Form.Group>
            </Col>

            <Col md={2} sm={6} xs={12}>
              <Form.Group className="mt-2">
                <Form.Label className="invisible">Espaciador</Form.Label>
                <Form.Check
                  type="switch"
                  id="dryRun"
                  label="Dry run"
                  checked={form.dryRun}
                  disabled={cargando}
                  onChange={handleChange('dryRun')}
                />
              </Form.Group>
            </Col>
          </Row>

          {!form.cicloLectivoId && (
            <Alert variant="warning" className="mt-3">
              Seleccioná un ciclo lectivo en Configuración &gt; Ciclo lectivo para poder ejecutar o simular.
            </Alert>
          )}

          <Row className="g-2 mt-4">
            <Col md="auto">
              <Button variant="secondary" onClick={() => submit('simular')} disabled={cargando}>
                {cargando ? <Spinner size="sm" /> : 'Simular'}
              </Button>
            </Col>
            <Col md="auto">
              <Button variant="primary" onClick={() => setShowConfirm(true)} disabled={cargando || !puedeEjecutarReal}>
                {cargando ? <Spinner size="sm" /> : 'Ejecutar promoción'}
              </Button>
              {!puedeEjecutarReal && (
                <div className="form-text mt-1">Solo ADMIN/DIRECTOR pueden ejecutar real</div>
              )}
            </Col>
          </Row>

          {cargando && (
            <Alert variant="info" className="mt-4">
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-3" />
                <div className="flex-grow-1">
                  <h5 className="mb-2">
                    {modoEjecucion === 'simular' ? 'Ejecutando simulación...' : 'Ejecutando promoción masiva...'}
                  </h5>
                  <div className="mb-2">
                    <strong>Tiempo transcurrido:</strong> {Math.floor(tiempoTranscurrido / 60)}:{String(tiempoTranscurrido % 60).padStart(2, '0')}
                  </div>
                  <div className="small text-muted">
                    <div>• Procesando alumnos del ciclo lectivo...</div>
                    <div>• Evaluando condiciones académicas...</div>
                    <div>• Aplicando reglas de promoción...</div>
                  </div>
                  <div className="mt-3 small">
                    <strong>Nota:</strong> Este proceso puede tardar hasta 30 minutos dependiendo de la cantidad de alumnos.
                    Por favor, no cierres esta ventana ni recargues la página.
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {resultado && (
            <>
              <hr />
              {resumen.code < 0 ? (
                <Alert variant="danger">{resumen.mensaje || 'Ocurrió un error'}</Alert>
              ) : (
                <Alert variant={resumen.dryRun ? 'warning' : 'success'}>
                  {resumen.mensaje || (resumen.dryRun ? 'Simulación completa' : 'Promoción completa')}
                </Alert>
              )}

              <Row className="g-3">
                <Col md={2}><strong>Procesados:</strong> {resumen.procesados}</Col>
                <Col md={2}><strong>Promocionados:</strong> <Badge bg="success">{resumen.promocionados}</Badge></Col>
                <Col md={2}><strong>Repitentes:</strong> <Badge bg="secondary">{resumen.repitentes}</Badge></Col>
                <Col md={2}><strong>Egresados:</strong> <Badge bg="info">{resumen.egresados}</Badge></Col>
                <Col md={2}><strong>Excluidos:</strong> <Badge bg="danger">{resumen.excluidos}</Badge></Col>
                <Col md={2}><strong>No procesados:</strong> {resumen.noProcesados}</Col>
              </Row>

              <h5 className="mt-4">Detalle</h5>
              {resumen.lista.length === 0 ? (
                <p className="text-muted">No hay detalle para mostrar.</p>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>DNI</th>
                      <th>Curso anterior</th>
                      <th>Curso nuevo</th>
                      <th>Acción</th>
                      <th>Desaprobadas</th>
                      <th>Repeticiones</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.lista.map((it, idx) => {
                      const alumnoLabel = [it.apellido, it.nombre].filter(Boolean).join(', ') || it.alumnoId;
                      const cursoNuevoFallback = it.accion === 'REPITENTE' && it.cursoAnterior
                        ? `${it.cursoAnterior} (Repite)`
                        : undefined;
                      const cursoNuevo = it.cursoNuevo || cursoNuevoFallback || '-';
                      return (
                        <tr key={it.alumnoId || idx}>
                          <td>{alumnoLabel}</td>
                          <td>{it.dni || '-'}</td>
                          <td>{it.cursoAnterior || '-'}</td>
                          <td>{cursoNuevo}</td>
                          <td>{it.accion || '-'}</td>
                          <td>{typeof it.materiasDesaprobadas === 'number' ? it.materiasDesaprobadas : '-'}</td>
                          <td>{typeof it.repeticionesActuales === 'number' ? it.repeticionesActuales : '-'}</td>
                          <td>{it.motivo || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Confirmación de ejecución real */}
      <ConfirmarAccion
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar promoción masiva"
        confirmText="Sí, ejecutar"
        cancelText="Cancelar"
        confirmBtnClass="btn-danger"
        loading={cargando}
        onConfirm={async () => {
          setShowConfirm(false);
          await submit('ejecutar');
        }}
        message={(
          <div>
            <p className="mb-2">
              Estás a punto de ejecutar la promoción masiva de alumnos para el año {String(form.anio)} en el ciclo lectivo {String(form.cicloLectivoNombre)}.
            </p>
            <div className="mb-2 small text-muted">
              <div><strong>Parámetros:</strong></div>
              <ul className="mb-0">
                <li>Año: {String(form.anio)}</li>
                <li>Ciclo lectivo: {String(form.cicloLectivoNombre)}</li>
                <li>Máx. repeticiones: {String(form.maxRepeticiones)}</li>
                <li>Modo: Ejecución real (no dry-run)</li>
              </ul>
            </div>
            <ul className="mb-2">
              <li>Menos de 3 materias desaprobadas: promocionan al curso siguiente.</li>
              <li>3 o más desaprobadas: repiten el curso.</li>
              <li>6° año: egresan automáticamente.</li>
              <li>Si superan el máximo de repeticiones ({form.maxRepeticiones}), serán excluidos por repetición.</li>
            </ul>
            <p className="text-danger mb-0"><strong>Advertencia:</strong> esta acción realiza cambios reales en la base de datos. Se recomienda ejecutar una simulación previa.</p>
          </div>
        )}
      />
    </Container>
  );
}
