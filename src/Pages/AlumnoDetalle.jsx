import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import { camposAlumno } from "../Entidades/camposAlumno";
import { editarAlumno } from "../Services/AlumnoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { inputLocalToBackendISO, isoToDisplay } from "../utils/fechas";
import { listarHistorialAlumnoFiltrado, obtenerHistorialActualAlumno } from "../Services/HistorialCursoService";
import { asignarCursoAlumno } from "../Services/AlumnoService";
import ModalSeleccionSimple from "../Components/Modals/ModalSeleccionSimple";
import { listarCursos } from "../Services/CursoService";
import { listarTutores } from "../Services/TutorService";
import { asignarTutorAAlumno, desasignarTutorDeAlumno } from "../Services/TutorAlumnoService";
import { getTituloCurso } from "../utils/cursos";

function AlumnoDetalle() {
  const location = useLocation();
  const navigate = useNavigate();
  const alumno = location.state;
  const { user } = useAuth();

  const [formData, setFormData] = useState(alumno || {});
  const [historial, setHistorial] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState("");
  const [histActual, setHistActual] = useState(null);
  const [histActualLoading, setHistActualLoading] = useState(true);
  const [histActualError, setHistActualError] = useState("");

  // cicloLectivoId fijo en 1 por ahora; no se usa estado
  const [cursoId] = useState(null);

  const [showAsignarCurso, setShowAsignarCurso] = useState(false);
  // Tutor asignación
  const [tutores, setTutores] = useState([]);
  const [tutoresLoading, setTutoresLoading] = useState(false);
  const [tutorIdSeleccionado, setTutorIdSeleccionado] = useState(alumno?.tutor?.id || "");

  // Historial completo
  useEffect(() => {
    const fetchHistorial = async () => {
      if (!user?.token || !alumno?.id) return;
      setHistLoading(true);
      setHistError("");
      try {
        const ciclo = 1; // hardcode temporal
        const data = await listarHistorialAlumnoFiltrado(
          user.token,
          alumno.id,
          { cicloLectivoId: ciclo, cursoId: cursoId || null }
        );

        const lista = Array.isArray(data?.historialCursos) ? data.historialCursos : [];
        setHistorial(lista);

        if (!histActual && lista.length) {
          const vigenteDerivado =
            lista.find((h) => (h.estado?.toUpperCase?.() === "VIGENTE") || (!h.fechaHasta))
            || lista.sort((a, b) => new Date(b.fechaDesde || 0) - new Date(a.fechaDesde || 0))[0];
          if (vigenteDerivado) {
            setHistActual(vigenteDerivado);
          }
        }
      } catch (e) {
        console.error(e);
        setHistError(e.message || "Error cargando historial");
      } finally {
        setHistLoading(false);
      }
    };
    fetchHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, alumno?.id, cursoId]);

  // Curso vigente
  useEffect(() => {
    const fetchActual = async () => {
      if (!user?.token || !alumno?.id) return;
      setHistActualLoading(true);
      setHistActualError("");
      try {
        const data = await obtenerHistorialActualAlumno(user.token, alumno.id);
        setHistActual(data?.historialCurso ?? null);
      } catch (e) {
        console.error(e);
        setHistActualError(e.message || "Error cargando curso vigente");
      } finally {
        setHistActualLoading(false);
      }
    };
    fetchActual();
  }, [user?.token, alumno?.id]);

  useEffect(() => {
    if (histActual) {
      setFormData((prev) => ({ ...prev, cursoActual: histActual }));
    }
  }, [histActual]);

  // Cargar tutores para asignación en modo edición
  useEffect(() => {
    const fetchTutores = async () => {
      if (!user?.token) return;
      setTutoresLoading(true);
      try {
        const lista = await listarTutores(user.token);
        setTutores(Array.isArray(lista) ? lista : []);
      } catch (e) {
        console.error(e);
      } finally {
        setTutoresLoading(false);
      }
    };
    fetchTutores();
  }, [user?.token]);

  if (!alumno) return <p>Cargando...</p>;

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        genero: formData.genero,
        tipoDoc: formData.tipoDoc,
        dni: formData.dni,
        email: formData.email,
        direccion: formData.direccion,
        telefono: formData.telefono,
        fechaNacimiento: inputLocalToBackendISO(formData.fechaNacimiento) || undefined,
        fechaIngreso: inputLocalToBackendISO(formData.fechaIngreso) || undefined,
      };

      await editarAlumno(user.token, payload);
      toast.success("Alumno actualizado con éxito");
    } catch (error) {
      toast.error(error.message || "Error actualizando alumno");
    }
  };

  const handleCancel = () => {
    setFormData(alumno);
  };

  return (
    <>
      <TablaDetalle
        titulo={`${alumno.nombre} ${alumno.apellido}`}
        subtitulo={`DNI: ${alumno.dni}`}
        onSave={handleSave}
        onCancel={handleCancel}
        tabs={[
          {
            id: "datos",
            label: "Datos personales",
            content: (modoEditar) =>
              !modoEditar ? (
                <RenderCampos campos={camposAlumno(true)} data={formData} />
              ) : (
                <>
                  <RenderCamposEditable
                    campos={camposAlumno(false, true)}
                    formData={formData}
                    setFormData={setFormData}
                  />

                  {/* Asignación de Tutor */}
                  <div className="card p-3 shadow-sm mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-bold">Tutor asignado</div>
                      {formData.tutor ? (
                        <span className="badge bg-success">{formData.tutor.nombre} {formData.tutor.apellido}</span>
                      ) : (
                        <span className="badge bg-secondary">Sin tutor</span>
                      )}
                    </div>

                    <div className="row g-2 align-items-end">
                      <div className="col-md-8">
                        <label className="form-label">Seleccionar tutor</label>
                        <select
                          className="form-control"
                          value={tutorIdSeleccionado}
                          disabled={tutoresLoading}
                          onChange={(e) => setTutorIdSeleccionado(e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {tutores.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre} {t.apellido} {t.dni ? `(DNI: ${t.dni})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary w-50"
                          disabled={!tutorIdSeleccionado || tutoresLoading}
                          onClick={async () => {
                            try {
                              await asignarTutorAAlumno(user.token, Number(tutorIdSeleccionado), alumno.id);
                              const tutorObj = tutores.find(t => String(t.id) === String(tutorIdSeleccionado)) || null;
                              setFormData(prev => ({ ...prev, tutor: tutorObj }));
                              toast.success("Tutor asignado correctamente");
                            } catch (e) {
                              toast.error(e.message || "Error al asignar tutor");
                            }
                          }}
                        >
                          Asignar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger w-50"
                          disabled={!formData.tutor}
                          onClick={async () => {
                            try {
                              await desasignarTutorDeAlumno(user.token, formData.tutor.id, alumno.id);
                              setFormData(prev => ({ ...prev, tutor: null }));
                              setTutorIdSeleccionado("");
                              toast.success("Tutor desasignado correctamente");
                            } catch (e) {
                              toast.error(e.message || "Error al desasignar tutor");
                            }
                          }}
                        >
                          Desasignar
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ),
          },
          {
            id: "historial",
            label: "Historial",
            content: () => (
              <div>
                {/* Curso vigente */}
                <div className="mb-3">
                  <h6 className="mb-2">Curso vigente</h6>
                  {histActualLoading && <p>Cargando curso vigente...</p>}
                  {histActualError && <p className="text-danger">{histActualError}</p>}
                  {!histActualLoading && !histActualError && (
                    histActual ? (
                      <div className="card">
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{getTituloCurso(histActual.curso)}</strong>{" "}
                              <span className="text-muted">
                                ({histActual.cicloLectivo?.nombre || ""})
                              </span>
                            </div>
                            <div className="text-end small">
                              {histActual.fechaDesde ? `Inicio: ${isoToDisplay(histActual.fechaDesde)}` : ""}
                              {histActual.fechaHasta ? ` • Fin: ${isoToDisplay(histActual.fechaHasta)}` : ""}
                              <div className="fw-semibold">{histActual.estado || ""}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>No tiene curso vigente</p>
                    )
                  )}
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setShowAsignarCurso(true)}
                    >
                      {histActual ? "Cambiar curso actual" : "Asignar curso"}
                    </button>
                  </div>
                </div>

                {/* Historial completo */}
                {histLoading && <p>Cargando historial...</p>}
                {histError && <p className="text-danger">{histError}</p>}
                {!histLoading && !histError && (
                  historial.length ? (
                    <ul className="list-group">
                      {historial.map((h) => {
                        const titulo = getTituloCurso(h.curso);
                        const sub = h.cicloLectivo?.nombre || "";
                        const fechas = [
                          h.fechaDesde ? `Inicio: ${isoToDisplay(h.fechaDesde)}` : null,
                          h.fechaHasta ? `Fin: ${isoToDisplay(h.fechaHasta)}` : null,
                        ].filter(Boolean).join(" • ");
                        return (
                          <li key={h.id}
                              className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <div><strong>{titulo}</strong>{" "}<span className="text-muted">({sub})</span></div>
                            </div>
                            <div className="text-end">
                              {fechas && <div className="small text-muted">{fechas}</div>}
                              <div className="fw-semibold">{h.estado || ""}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No tiene historial</p>
                  )
                )}
              </div>
            ),
          },
          {
            id: "reportes",
            label: "Reportes",
            content: () => (
              <div>
                <div className="mb-3">
                  <h6 className="mb-3">📊 Generar reportes del alumno</h6>
                  <p className="text-muted small mb-3">
                    Hacé clic en cualquiera de los botones para ir directamente al reporte con los datos de este alumno ya pre-cargados.
                  </p>
                  <div className="d-flex gap-3 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => navigate('/reportes/legajo-alumno', { 
                        state: { preselectedAlumnoId: alumno.id } 
                      })}
                    >
                      📄 Generar Legajo del Alumno
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={() => navigate('/reportes/notas-alumnos', { 
                        state: { preselectedAlumnoId: alumno.id } 
                      })}
                    >
                      📝 Ver Reporte de Notas
                    </button>
                  </div>
                </div>
                
                <hr className="my-4" />
                
                <div className="alert alert-info">
                  <strong>💡 Tip:</strong> Estos reportes se abrirán en una nueva vista con la información de <strong>{alumno.nombre} {alumno.apellido}</strong> ya seleccionada. Solo tendrás que hacer clic en "Generar" para obtener el reporte.
                </div>
              </div>
            ),
          },
        ]}
      />
      <ModalSeleccionSimple
        show={showAsignarCurso}
        onClose={() => setShowAsignarCurso(false)}
        titulo={`Asignar curso a ${alumno?.nombre} ${alumno?.apellido}`}
        entidad={{ id: alumno?.id, cursoActual: histActual }}
        campoAsignado="cursoActual"
        obtenerOpciones={async (token) => {
          const lista = await listarCursos(token);
          return lista.map(c => ({
            value: c.id,
            label: getTituloCurso(c)
          }));
        }}
        onAsignar={async (token, cursoIdSeleccionado, alumnoId) => {
          const req = { alumnoId, cursoId: cursoIdSeleccionado, cicloLectivoId: 1 };
          await asignarCursoAlumno(token, req);
          try {
            const dataActual = await obtenerHistorialActualAlumno(token, alumnoId);
            const vigente = dataActual?.historialCurso ?? null;
            setHistActual(vigente);
            if (vigente) {
              setFormData((prev) => ({ ...prev, cursoActual: vigente }));
            }
            const dataLista = await listarHistorialAlumnoFiltrado(
              token,
              alumnoId,
              { cicloLectivoId: 1, cursoId: cursoId || null }
            );
            const listaRef = Array.isArray(dataLista?.historialCursos) ? dataLista.historialCursos : [];
            setHistorial(listaRef);
          } catch (err) {
            console.error(err);
          }
        }}
        onDesasignar={async () => { toast.info("Para desasignar, reasigná a otro curso"); }}
        token={user?.token}
        onActualizar={() => {}}
      />
    </>
  );
}

export default AlumnoDetalle;
