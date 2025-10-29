import React, { useEffect, useState } from "react";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { Button, Modal, Form, Table, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { listarCursosPorDocente, listarCursos } from "../Services/CursoService";
import { listarEspaciosAulicos } from "../Services/EspacioAulicoService";
import { getModulosConEstadoPorDia } from "../Services/ModuloService";
import { solicitarReserva } from "../Services/ReservaService";

// Utilidad: mapear Date -> 'DiaSemana' del backend
const diaSemanaBackend = (yyyyMmDd) => {
  if (!yyyyMmDd) return null;
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  const day = d.getDay(); // 0=Domingo ... 6=Sábado
  switch (day) {
    case 0: return "DOMINGO";
    case 1: return "LUNES";
    case 2: return "MARTES";
    case 3: return "MIERCOLES"; // sin tilde, como enum backend
    case 4: return "JUEVES";
    case 5: return "VIERNES";
    case 6: return "SABADO";
    default: return null;
  }
};

export default function ReservarEspacio() {
  const { user } = useAuth();
  const token = user?.token;
  const docenteId = user?.docenteId;

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

  // Carga inicial: cursos del docente y espacios
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setCargando(true);
      setError(null);
      try {
        let cursosData = [];
        if (docenteId) {
          cursosData = await listarCursosPorDocente(token, docenteId);
        }
        if (!docenteId || cursosData.length === 0) {
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
  }, [token, docenteId]);

  // Cargar módulos por día cuando tengo curso, fecha y espacio áulico
  useEffect(() => {
    let active = true;
    async function loadModulos() {
      if (!cursoId || !fecha || !espacioId) { setModulos([]); return; }
      const diaParam = diaSemanaBackend(fecha);
      if (!diaParam) { setModulos([]); return; }
      setCargandoModulos(true);
      setError(null);
      try {
        const data = await getModulosConEstadoPorDia(token, cursoId, diaParam);
        if (!active) return;
        // backend responde { modulos: [...] }
        setModulos(Array.isArray(data.modulos) ? data.modulos : []);
      } catch (e) {
        if (active) setError(e?.message || "Error al cargar módulos");
        if (active) setModulos([]);
      } finally {
        if (active) setCargandoModulos(false);
      }
    }
    loadModulos();
    return () => { active = false; };
  }, [cursoId, fecha, espacioId, token]);

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
      // Actualizar estado localmente para reflejar ocupado
      setModulos((prev) => prev.map(m => {
        if (m.modulo.id === moduloSeleccionado.modulo.id) {
          let nuevasReservas = Array.isArray(m.reservas) ? [...m.reservas] : [];
          nuevasReservas.push({ espacioAulicoId: Number(espacioId) });
          return { ...m, reservas: nuevasReservas };
        }
        return m;
      }));
    } catch (e) {
      toast.error(e?.message || "No se pudo crear la reserva");
      // Si el error es que el espacio ya está reservado, actualizar el estado localmente
      if ((e?.message || "").includes("El espacio ya está reservado")) {
        setModulos((prev) => prev.map(m => {
          if (m.modulo.id === moduloSeleccionado.modulo.id) {
            let nuevasReservas = Array.isArray(m.reservas) ? [...m.reservas] : [];
            nuevasReservas.push({ espacioAulicoId: Number(espacioId) });
            return { ...m, reservas: nuevasReservas };
          }
          return m;
        }));
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
                      {`${c.anio ?? ''}° ${formatNivel(c.nivel)} ${c.division ?? ''}`.trim()}
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
                {espacios.length === 0 && (
                  <small className="text-muted">No hay espacios o no tenés permisos para listarlos.</small>
                )}
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
                    // Solo marcar como ocupado si el espacio áulico seleccionado está reservado en ese módulo y fecha
                    let ocupado = false;
                    if (Array.isArray(m.reservas) && espacioId) {
                      ocupado = m.reservas.some(r => String(r.espacioAulicoId) === String(espacioId));
                    }
                    const libre = !ocupado;
                    return (
                      <tr key={m.modulo.id} className={libre ? "" : "table-danger"}>
                        <td>{m.modulo.orden}</td>
                        <td>{m.modulo.desde}</td>
                        <td>{m.modulo.hasta}</td>
                        <td>{libre ? "Libre" : "Ocupado"}</td>
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

// Helpers
function formatNivel(nivel) {
  if (!nivel) return '';
  const map = {
    BASICO: 'Básico',
    ORIENTADO: 'Orientado',
  };
  return map[nivel] || String(nivel).charAt(0) + String(nivel).slice(1).toLowerCase();
}
