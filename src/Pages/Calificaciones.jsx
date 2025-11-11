import { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import {
  listarCalifPorMateria,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
} from "../Services/CalificacionesService";
import TablaCalificaciones from "../Components/Calificaciones/TablaCalificaciones";
import { Container, Row, Col, Form, Button, Spinner, Modal, Card, Alert, Badge } from "react-bootstrap";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

export default function Calificaciones() {
  const { user } = useAuth();
  const token = user?.token;
  const navigate = useNavigate();
  const { cicloLectivo } = useCicloLectivo();

  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [etapa, setEtapa] = useState("1");
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState([]); // alumnos + calificaciones
  const [mostrarExito, setMostrarExito] = useState(false); // Modal de éxito SOLO masivo
  const [mensajeExito, setMensajeExito] = useState("");
  const [mostrarError, setMostrarError] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  // Nota Final se muestra solo en reportes; en esta pantalla de carga no se utiliza

  // 1️⃣ Traer cursos disponibles (según el rol)
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        let data = [];
        
        // Si es DOCENTE, traer solo sus cursos
        if (user?.rol === 'ROLE_DOCENTE' && user?.docenteId) {
          data = await listarCursosPorDocente(token, user.docenteId);
        } 
        // Si es PRECEPTOR, traer solo sus cursos
        else if (user?.rol === 'ROLE_PRECEPTOR' && user?.preceptorId) {
          data = await listarCursosPorPreceptor(token, user.preceptorId);
        }
        // Si es ADMIN/DIRECTOR, traer todos
        else {
          data = await listarCursos(token);
        }

        const sorted = [...(data || [])].sort((a, b) => {
          const anioDiff = (Number(a.anio) || 0) - (Number(b.anio) || 0);
          if (anioDiff !== 0) return anioDiff;
          const divA = (a.division || "").toString();
          const divB = (b.division || "").toString();
          const divDiff = divA.localeCompare(divB, 'es', { numeric: true, sensitivity: 'base' });
          if (divDiff !== 0) return divDiff;
          const nivA = (a.nivel || "").toString();
          const nivB = (b.nivel || "").toString();
          return nivA.localeCompare(nivB, 'es', { sensitivity: 'base' });
        });
        setCursos(sorted);
      } catch (err) {
        console.error("Error al cargar cursos", err);
      }
    };
    fetchCursos();
  }, [token, user?.rol, user?.docenteId, user?.preceptorId]);

  // 2️⃣ Cuando selecciona curso → traer materias y (si hay permiso) alumnos
  const [alumnosError, setAlumnosError] = useState(null);
  useEffect(() => {
    if (!cursoSeleccionado) return;

    const fetchMateriasYAlumnos = async () => {
      // Reiniciar selección al cambiar curso
      setMateriaSeleccionada("");
      setAlumnosError(null);
      try {
        const mats = await listarMateriasDeCurso(token, cursoSeleccionado);
        
        // 🔹 Si es DOCENTE, filtrar solo las materias que él dicta
        let materiasDisponibles = mats;
        if (user?.rol === 'ROLE_DOCENTE' && user?.docenteId) {
          materiasDisponibles = mats.filter(m => 
            m.docente?.id === user.docenteId || m.docenteId === user.docenteId
          );
        }
        
        setMaterias(materiasDisponibles);
      } catch (err) {
        console.error("Error al cargar materias", err);
        setMaterias([]);
      }

      try {
        const alums = await listarAlumnosPorCurso(token, cursoSeleccionado, cicloLectivo?.id ?? null);
        setAlumnos(alums);
        setAlumnosError(null);
      } catch (err) {
        // Si el backend devuelve 403, no bloquear la carga de materias
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("403") || msg.includes("no autorizado")) {
          console.warn("Sin permisos para listar alumnos del curso (403)");
          setAlumnos([]);
          setAlumnosError("No tenés permisos para ver los alumnos de este curso. Las materias se cargaron igualmente.");
        } else if ((err?.message || '').toLowerCase().includes('ciclo lectivo')) {
          setAlumnos([]);
          setAlumnosError('Seleccioná un ciclo lectivo en Configuración > Ciclo lectivo');
        } else {
          console.error("Error al cargar alumnos", err);
          setAlumnos([]);
        }
      }
    };

    fetchMateriasYAlumnos();
  }, [cursoSeleccionado, token, cicloLectivo?.id, user?.rol, user?.docenteId]);

  // (NF removida de esta pantalla)

  // Encabezado con ciclo visible
  const CicloHeader = () => (
    <div className="mb-2">
      {cicloLectivo?.id ? (
        <Badge bg="secondary">Ciclo lectivo: {String(cicloLectivo?.nombre || cicloLectivo?.id)}</Badge>
      ) : (
        <Alert variant="warning" className="py-1 px-2 mb-0">Seleccioná un ciclo lectivo en Configuración &gt; Ciclo lectivo</Alert>
      )}
    </div>
  );
  // 3️⃣ Cargar calificaciones del curso/materia/etapa
  const handleBuscar = async () => {
    if (!materiaSeleccionada || !cursoSeleccionado) return;
    setLoading(true);
    try {
      if (!alumnos || alumnos.length === 0) {
        setDatos([]);
        return;
      }

      const resultados = await Promise.allSettled(
        alumnos.map(async (alumno) => {
          try {
            const califsResp = await listarCalifPorMateria(
              token,
              alumno.id,
              Number(materiaSeleccionada)
            );
            const califsArr = Array.isArray(califsResp)
              ? califsResp
              : califsResp?.calificaciones || califsResp?.lista || [];
            const etapaNotas = califsArr.filter((c) => Number(c.etapa) === Number(etapa));
            return { ...alumno, calificaciones: etapaNotas };
          } catch (e) {
            console.warn("No se pudieron traer calificaciones de", alumno.id, e);
            return { ...alumno, calificaciones: [] };
          }
        })
      );

      const alumnosConNotas = resultados.map((r) => r.value || r.reason).filter(Boolean);
      setDatos(alumnosConNotas);
    } catch (err) {
      console.error("Error al listar calificaciones", err);
    } finally {
      setLoading(false);
    }
  };

  // 3.1️⃣ Al cambiar de etapa, actualizar automáticamente la planilla si ya hay selección válida
  useEffect(() => {
    if (!materiaSeleccionada || !cursoSeleccionado) return;
    // Reutiliza la misma lógica de búsqueda para la nueva etapa seleccionada
    handleBuscar();
    // Dependemos solo de 'etapa' para refrescar cuando cambie; las demás
    // variables se leen de su estado actual dentro de handleBuscar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  // 4️⃣ Guardar cambios desde la tabla
  const handleGuardar = async (alumnoId, notas) => {
    try {
      for (const n of notas) {
        // Ruta de actualización usa califId; creación usa CalificacionRequest
        if (n._tipo === "update") {
          const { _tipo, ...payload } = n;
          await actualizarCalificacion(token, payload);
        } else {
          const { _tipo, ...payload } = n;
          await crearCalificacion(token, payload);
        }
      }
  // Guardado individual: solo toast, sin modal
  toast.success("Notas guardadas correctamente ", { theme: "light" });
      handleBuscar();
    } catch (err) {
      console.error("Error al guardar calificaciones", err);
      setMensajeError("Error al guardar notas");
      setMostrarError(true);
    }
  };

  // 5️⃣ Eliminar una calificación concreta (por número de nota)
  const handleEliminar = async (alumnoId, numeroNota, califId) => {
    try {
      await eliminarCalificacion(token, alumnoId, Number(materiaSeleccionada), Number(califId));
      handleBuscar();
    } catch (err) {
      console.error("Error al eliminar calificación", err);
      setMensajeError("No se pudo eliminar la calificación");
      setMostrarError(true);
    }
  };

  // Guardar todos: recibe [{ alumnoId, payloads }]
  const handleGuardarTodos = async (lotes) => {
    try {
      for (const lote of lotes) {
        for (const n of lote.payloads) {
          if (n._tipo === "update") {
            const { _tipo, ...payload } = n;
            await actualizarCalificacion(token, payload);
          } else {
            const { _tipo, ...payload } = n;
            await crearCalificacion(token, payload);
          }
        }
      }
  // Guardado masivo: modal + toast
      setMensajeExito("Todas las calificaciones fueron guardadas");
      setMostrarExito(true);
  toast.success("Todas las calificaciones fueron guardadas", { theme: "light" });
      handleBuscar();
    } catch (err) {
      console.error("Error en guardado masivo", err);
      setMensajeError("Ocurrió un error guardando algunas calificaciones");
      setMostrarError(true);
    }
  };

  return (
    <Container className="py-4">
      {/* Migas de pan y botón volver debajo */}
      <div className="mb-3">
        <Breadcrumbs />
        <Button variant="outline-secondary" className="mt-2" onClick={() => navigate(-1)}>← Volver</Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-2">Carga de Calificaciones</h3>
          <CicloHeader />

          {/* FILTROS */}
          <Row className="mb-3">
            <Col md={4}>
              <Form.Select
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
              >
                <option value="">Seleccione curso</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.anio}° {c.division} - {c.nivel}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={materiaSeleccionada}
                onChange={(e) => setMateriaSeleccionada(e.target.value)}
                disabled={!cursoSeleccionado}
              >
                <option value="">Seleccione materia</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreMateria || m.nombre || "Sin nombre"}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={etapa} onChange={(e) => setEtapa(e.target.value)}>
                <option value="1">Etapa 1</option>
                <option value="2">Etapa 2</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button onClick={handleBuscar} disabled={loading}>
                {loading ? <Spinner size="sm" /> : "Buscar"}
              </Button>
            </Col>
          </Row>

          {alumnosError && (
            <Row className="mb-3">
              <Col>
                <div className="text-danger small">{alumnosError}</div>
              </Col>
            </Row>
          )}

          {/* TABLA */}
          {datos.length > 0 && (
            <TablaCalificaciones
              datos={datos}
              materiaId={materiaSeleccionada}
              materiaCursoId={(() => {
                const sel = materias.find((m) => Number(m.id) === Number(materiaSeleccionada));
                return sel?.materiaCursoId;
              })()}
              etapa={etapa}
              onGuardar={handleGuardar}
              onEliminar={handleEliminar}
              onGuardarTodos={handleGuardarTodos}
            />
          )}
        </Card.Body>
      </Card>

      {/* Modal de éxito (solo para guardado masivo) */}
      <Modal show={mostrarExito} onHide={() => setMostrarExito(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Guardado masivo</Modal.Title>
        </Modal.Header>
        <Modal.Body>{mensajeExito}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setMostrarExito(false)}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal error */}
      <Modal show={mostrarError} onHide={() => setMostrarError(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>{mensajeError}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setMostrarError(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>


    </Container>
  );
}
