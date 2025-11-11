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
  const [moduloSeleccionado, setModuloSeleccionado] = useState(null); // objeto ModuloEstadoDto
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

  const abrirReserva = (mod) => {
    setModuloSeleccionado(mod);
    setShow(true);
  };
  const cerrarReserva = () => setShow(false);

  const confirmarReserva = async () => {
    try {
      if (!cursoId || !espacioId || !moduloSeleccionado?.modulo?.id || !fecha) {
        setError("Completá curso, fecha, espacio y módulo antes de confirmar.");
        return;
      }
      const payload = {
        cursoId: Number(cursoId),
        espacioAulicoId: Number(espacioId),
        moduloId: Number(moduloSeleccionado.modulo.id),
        fecha, // LocalDate en backend (YYYY-MM-DD)
        motivoSolicitud: motivo || undefined,
      };
      const resp = await solicitarReserva(token, payload);
      toast.success(resp?.mensaje || "Reserva solicitada");
      setShow(false);
      setMotivo("");
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
          <div className="mt-3">
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0">Módulos para {fecha || "(seleccioná fecha)"}</h5>
              {cargandoModulos && <Spinner size="sm" className="ms-2" />}
            </div>
            <Table bordered hover size="sm">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {modulos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">Sin datos</td>
                  </tr>
                ) : (
                  modulos.map((m) => {
                    // Usar estado de reserva provisto por el backend
                    const libre = !m.ocupado;
                    return (
                      <tr key={m.modulo.id} className={libre ? "" : "table-danger"}>
                        <td>{m.modulo.orden}</td>
                        <td>{m.modulo.desde}</td>
                        <td>{m.modulo.hasta}</td>
                        <td>{libre ? "Libre" : (m.motivoOcupacion ? `Ocupado - ${m.motivoOcupacion}` : "Ocupado")}</td>
                        <td>
                          <Button
                            size="sm"
                            variant={libre ? "success" : "secondary"}
                            disabled={!libre || !espacioId || !cursoId || !fecha}
                            onClick={() => abrirReserva(m)}
                          >
                            Reservar
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Modal de confirmación */}
          <Modal show={show} onHide={cerrarReserva} centered>
            <Modal.Header closeButton>
              <Modal.Title>Confirmar Reserva</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {moduloSeleccionado && (
                <>
                  <p className="mb-2"><strong>Fecha:</strong> {fecha}</p>
                  <p className="mb-2"><strong>Módulo:</strong> {moduloSeleccionado.modulo.orden} ({moduloSeleccionado.modulo.desde} - {moduloSeleccionado.modulo.hasta})</p>
                  <p className="mb-2"><strong>Espacio:</strong> {espacios.find(e => String(e.id) === String(espacioId))?.nombre || ""}</p>
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
              <Button variant="success" onClick={confirmarReserva}>Confirmar</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </div>
  );
}

// Helpers (ya no mostramos nivel en el selector de curso)
