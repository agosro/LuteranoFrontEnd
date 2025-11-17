import React, { useEffect, useState } from "react";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { Button, Modal, Form, Table, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { listarCursosPorDocente, listarCursosPorPreceptor, listarCursos } from "../Services/CursoService";
import { listarEspaciosAulicos } from "../Services/EspacioAulicoService";
import { getModulosReservaEstado } from "../Services/ModuloService";
import { solicitarReserva } from "../Services/ReservaService";

// (Ya no se requiere mapear día de semana; el endpoint de reservas usa fecha directamente)

export default function ReservarEspacio() {
  const { user } = useAuth();
  const token = user?.token;
  const docenteId = user?.docenteId;
  const preceptorId = user?.preceptorId;
  const rol = user?.rol;

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [cursos, setCursos] = useState([]);
  const [espacios, setEspacios] = useState([]);

  const [cursoId, setCursoId] = useState("");
  const [fecha, setFecha] = useState(""); // yyyy-mm-dd

  const [modulos, setModulos] = useState([]); // [{ modulo:{id,orden,desde,hasta}, ocupado, horario }]
  const [cargandoModulos, setCargandoModulos] = useState(false);

  const [espacioId, setEspacioId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [modulosSeleccionados, setModulosSeleccionados] = useState([]); // array de IDs de módulos
  const [show, setShow] = useState(false);

  // Carga inicial: cursos del docente/preceptor y espacios
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setCargando(true);
      setError(null);
      try {
        let cursosData = [];
        
        // 🔹 Si es DOCENTE, traer sus cursos
        if (rol === 'ROLE_DOCENTE' && docenteId) {
          cursosData = await listarCursosPorDocente(token, docenteId);
        } 
        // 🔹 Si es PRECEPTOR, traer sus cursos
        else if (rol === 'ROLE_PRECEPTOR' && preceptorId) {
          cursosData = await listarCursosPorPreceptor(token, preceptorId);
        }
        // 🔹 Si es ADMIN/DIRECTOR o no tiene cursos asignados, traer todos
        else {
          cursosData = await listarCursos(token);
        }
        
        if (mounted) setCursos(cursosData);

        // Espacios áulicos (puede requerir permisos; capturamos error y continuamos)
        try {
          const espaciosData = await listarEspaciosAulicos(token);
          if (mounted) setEspacios(espaciosData);
        } catch (e) {
          console.warn("No se pudieron cargar espacios áulicos:", e?.message);
          if (mounted) setEspacios([]);
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Error cargando datos iniciales");
      } finally {
        if (mounted) setCargando(false);
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, [token, docenteId, preceptorId, rol]);

  // Cargar módulos (estado de reserva) cuando tengo fecha y espacio áulico
  useEffect(() => {
    let active = true;
    async function loadModulos() {
      if (!fecha || !espacioId) { setModulos([]); return; }
      setCargandoModulos(true);
      setError(null);
      try {
        const data = await getModulosReservaEstado(token, Number(espacioId), fecha);
        if (!active) return;
        const lista = Array.isArray(data.modulos) ? data.modulos : [];
        const mapeado = lista.map((d) => ({
          modulo: {
            id: d.id,
            orden: d.orden,
            desde: d.horaInicio,
            hasta: d.horaFin,
          },
          ocupado: !!d.ocupado,
          motivoOcupacion: d.motivoOcupacion || null,
        }));
        setModulos(mapeado);
      } catch (e) {
        if (active) setError(e?.message || "Error al cargar módulos");
        if (active) setModulos([]);
      } finally {
        if (active) setCargandoModulos(false);
      }
    }
    loadModulos();
    return () => { active = false; };
  }, [fecha, espacioId, token]);

  const toggleModuloSeleccionado = (modId) => {
    setModulosSeleccionados(prev => {
      if (prev.includes(modId)) {
        return prev.filter(id => id !== modId);
      } else {
        return [...prev, modId].sort((a, b) => {
          const modA = modulos.find(m => m.modulo.id === a);
          const modB = modulos.find(m => m.modulo.id === b);
          return (modA?.modulo.orden || 0) - (modB?.modulo.orden || 0);
        });
      }
    });
  };

  const abrirReserva = () => {
    if (modulosSeleccionados.length === 0) return;
    setShow(true);
  };
  const cerrarReserva = () => {
    setShow(false);
    setModulosSeleccionados([]);
  };

  const confirmarReserva = async () => {
    try {
      if (!cursoId || !espacioId || modulosSeleccionados.length === 0 || !fecha) {
        toast.error("Completá curso, fecha, espacio y seleccioná al menos un módulo.");
        return;
      }
      
      // Crear payload para cada módulo seleccionado
      const payloads = modulosSeleccionados.map(moduloId => ({
        cursoId: Number(cursoId),
        espacioAulicoId: Number(espacioId),
        moduloId: Number(moduloId),
        fecha,
        motivoSolicitud: motivo || undefined,
      }));

      // Enviar todas las reservas en paralelo
      const resultados = await Promise.all(
        payloads.map(payload => solicitarReserva(token, payload))
      );
      
      toast.success(`${resultados.length} reserva${resultados.length > 1 ? 's' : ''} solicitada${resultados.length > 1 ? 's' : ''}`);
      setShow(false);
      setMotivo("");
      setModulosSeleccionados([]);
      
      // Refrescar ocupación desde backend
      try {
        const data = await getModulosReservaEstado(token, Number(espacioId), fecha);
        const lista = Array.isArray(data.modulos) ? data.modulos : [];
        const mapeado = lista.map((d) => ({
          modulo: { id: d.id, orden: d.orden, desde: d.horaInicio, hasta: d.horaFin },
          ocupado: !!d.ocupado,
          motivoOcupacion: d.motivoOcupacion || null,
        }));
        setModulos(mapeado);
      } catch { /* ignore */ }
    } catch (e) {
      toast.error(e?.message || "No se pudo crear la reserva");
      // Si el error es que el espacio ya está reservado, refrescar ocupación y cerrar modal
      if ((e?.message || "").toLowerCase().includes("ya está reservado")) {
        try {
          const data = await getModulosReservaEstado(token, Number(espacioId), fecha);
          const lista = Array.isArray(data.modulos) ? data.modulos : [];
          const mapeado = lista.map((d) => ({
            modulo: { id: d.id, orden: d.orden, desde: d.horaInicio, hasta: d.horaFin },
            ocupado: !!d.ocupado,
            motivoOcupacion: d.motivoOcupacion || null,
          }));
          setModulos(mapeado);
        } catch { /* ignore */ }
        setShow(false);
      }
    }
  };

  return (
    <div className="container mt-4">
      <Breadcrumbs />
      <BackButton />
      <div className="card mt-3">
        <div className="card-body">
          <h3 className="mb-3">Reservar Espacio Áulico</h3>

          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {/* Filtros / selección */}
          <Form className="mb-3">
            <div className="row g-3 align-items-end">
              <Form.Group className="col-md-4">
                <Form.Label>Curso</Form.Label>
                <Form.Select value={cursoId} onChange={(e) => setCursoId(e.target.value)} disabled={cargando || cursos.length === 0}>
                  <option value="">Seleccioná un curso</option>
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.anio ?? ''}°${c.division ?? ''}`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="col-md-3">
                <Form.Label>Fecha</Form.Label>
                <Form.Control type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Form.Group>

              <Form.Group className="col-md-4">
                <Form.Label>Espacio Áulico</Form.Label>
                <Form.Select value={espacioId} onChange={(e) => setEspacioId(e.target.value)} disabled={cargando}>
                  <option value="">Seleccioná un espacio</option>
                  {espacios.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} {e.ubicacion ? `- ${e.ubicacion}` : ''} (cap. {e.capacidad})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
          </Form>

          {/* Tabla de módulos del día seleccionado */}
          {fecha && espacioId && cursoId ? (
            <div className="mt-3">
              <div className="d-flex align-items-center mb-2">
                <h5 className="mb-0">Módulos para {fecha}</h5>
                {cargandoModulos && <Spinner size="sm" className="ms-2" />}
              </div>
              <Table bordered hover size="sm">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Módulo</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {modulos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">Sin datos</td>
                    </tr>
                  ) : (
                    modulos.map((m) => {
                      const libre = !m.ocupado;
                      const isSelected = modulosSeleccionados.includes(m.modulo.id);
                      return (
                        <tr key={m.modulo.id} className={isSelected ? "table-info" : libre ? "" : "table-danger"} style={!libre ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                          <td className="text-center">
                            <Form.Check
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleModuloSeleccionado(m.modulo.id)}
                              disabled={!libre}
                              title={!libre ? "Este módulo ya está ocupado" : "Seleccionar módulo"}
                            />
                          </td>
                          <td>{m.modulo.orden}</td>
                          <td>{m.modulo.desde}</td>
                          <td>{m.modulo.hasta}</td>
                          <td>
                            <strong>{libre ? "✓ Libre" : "✗ Ocupado"}</strong>
                            {!libre && m.motivoOcupacion && ` - ${m.motivoOcupacion}`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="mt-3 text-center text-muted">
              <p>Seleccioná un curso, fecha y espacio áulico para ver los módulos disponibles.</p>
            </div>
          )}

          {/* Botón para abrir modal si hay módulos seleccionados */}
          {fecha && espacioId && cursoId && modulosSeleccionados.length > 0 && (
            <div className="mt-3 d-flex gap-2">
              <Button variant="success" onClick={abrirReserva}>
                Confirmar {modulosSeleccionados.length} módulo{modulosSeleccionados.length > 1 ? 's' : ''}
              </Button>
              <Button variant="outline-secondary" onClick={() => setModulosSeleccionados([])}>
                Limpiar selección
              </Button>
            </div>
          )}

          {/* Modal de confirmación */}
          <Modal show={show} onHide={cerrarReserva} centered>
            <Modal.Header closeButton>
              <Modal.Title>Confirmar Reserva{modulosSeleccionados.length > 1 ? 's' : ''}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {modulosSeleccionados.length > 0 && (
                <>
                  <p className="mb-2"><strong>Fecha:</strong> {fecha}</p>
                  <p className="mb-2"><strong>Espacio:</strong> {espacios.find(e => String(e.id) === String(espacioId))?.nombre || ""}</p>
                  <p className="mb-3"><strong>Módulos seleccionados ({modulosSeleccionados.length}):</strong></p>
                  <div className="mb-3 p-2 bg-light rounded">
                    {modulosSeleccionados.map(modId => {
                      const mod = modulos.find(m => m.modulo.id === modId);
                      return (
                        <div key={modId} className="mb-1">
                          Módulo {mod?.modulo.orden} ({mod?.modulo.desde} - {mod?.modulo.hasta})
                        </div>
                      );
                    })}
                  </div>
                  <Form.Group>
                    <Form.Label>Motivo / Curso</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ej: 5to A - Matemática"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </Form.Group>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={cerrarReserva}>Cancelar</Button>
              <Button variant="success" onClick={confirmarReserva}>Confirmar {modulosSeleccionados.length > 1 ? modulosSeleccionados.length + ' reservas' : 'reserva'}</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </div>
  );
}

// Helpers (ya no mostramos nivel en el selector de curso)
