import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import { camposAlumno } from "../Entidades/camposAlumno";
import { editarAlumno, listarAlumnos } from "../Services/AlumnoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { inputLocalToBackendISO, isoToDisplay } from "../utils/fechas";
import { listarHistorialAlumnoFiltrado, obtenerHistorialActualAlumno } from "../Services/HistorialCursoService";
import { asignarCursoAlumno } from "../Services/AlumnoService";
import ModalSeleccionSimple from "../Components/Modals/ModalSeleccionSimple";
import { listarCursos } from "../Services/CursoService";
import ModalAsignarTutores from "../Components/Modals/ModalAsignarTutores";
import { getTituloCurso } from "../utils/cursos";
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";
import { FileText, FileSpreadsheet, BookOpen, Clock } from "lucide-react";

function AlumnoDetalle() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const alumnoState = location.state;
  const { user } = useAuth();
  const { cicloLectivo } = useCicloLectivo();

  const [alumno, setAlumno] = useState(alumnoState || null);
  const [formData, setFormData] = useState(alumnoState || {});
  const [loadingAlumno, setLoadingAlumno] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState("");
  const [histActual, setHistActual] = useState(null);
  const [histActualLoading, setHistActualLoading] = useState(true);
  const [histActualError, setHistActualError] = useState("");

  const [cursoId] = useState(null);

  const [showAsignarCurso, setShowAsignarCurso] = useState(false);
  // Tutores: modal y gestión multi
  const [showTutoresModal, setShowTutoresModal] = useState(false);

  // Cargar alumno si no viene en el state (cuando se abre en nueva pestaña)
  useEffect(() => {
    const fetchAlumno = async () => {
      if (!user?.token) return;
      try {
        setLoadingAlumno(true);
        const lista = await listarAlumnos(user.token);
        const a = (lista || []).find(x => String(x.id) === String(id)) || null;
        if (a) {
          setAlumno(a);
          setFormData(a);
        } else if (alumnoState) {
          // fallback al state si no se encontró en el listado
          setAlumno(alumnoState);
          setFormData(alumnoState);
        } else {
          toast.error("Alumno no encontrado");
          navigate("/alumnos/filtro");
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Error cargando alumno");
        if (alumnoState) {
          setAlumno(alumnoState);
          setFormData(alumnoState);
        }
      } finally {
        setLoadingAlumno(false);
      }
    };
    fetchAlumno();
  }, [user?.token, id, alumnoState, navigate]);

  // Historial completo
  useEffect(() => {
    const fetchHistorial = async () => {
      if (!user?.token || !alumno?.id) return;
      setHistLoading(true);
      setHistError("");
      try {
        const ciclo = cicloLectivo?.id ?? null;
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

  // ya no se cargan todos los tutores; se buscan desde el modal con debounce

  if (loadingAlumno) return <p>Cargando...</p>;
  if (!alumno) return <p>Alumno no encontrado</p>;

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

                  {/* Gestión de Tutores (multi) */}
                  <div className="card p-3 shadow-sm mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-bold">Tutores asignados</div>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowTutoresModal(true)}>
                        Gestionar tutores
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {(formData.tutores || []).length === 0 && <span className="text-muted">Sin tutores</span>}
                      {(formData.tutores || []).map(t => (
                        <span key={t.id} className="badge bg-success">{t.apellido} {t.nombre}</span>
                      ))}
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
                  <h6 className="mb-3 d-flex align-items-center gap-2">
                    <FileText size={20} />
                    Generar reportes del alumno
                  </h6>
                  <p className="text-muted small mb-3">
                    Los reportes se generan automáticamente al hacer clic en el botón.
                  </p>
                  <div className="d-flex gap-3 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-primary d-flex align-items-center gap-2"
                      onClick={() => {
                        const url = `/reportes/legajo-alumno?alumnoId=${alumno.id}&auto=true`;
                        window.open(url, '_blank');
                      }}
                    >
                      <FileText size={18} />
                      Legajo del Alumno
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-success d-flex align-items-center gap-2"
                      onClick={() => {
                        const url = `/reportes/notas-alumnos?alumnoId=${alumno.id}&auto=true`;
                        window.open(url, '_blank');
                      }}
                    >
                      <FileSpreadsheet size={18} />
                      Reporte de Notas
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-info d-flex align-items-center gap-2"
                      onClick={() => {
                        const url = `/reportes/reporte-anual-alumno?alumnoId=${alumno.id}&auto=true`;
                        window.open(url, '_blank');
                      }}
                    >
                      <BookOpen size={18} />
                      Informe Anual
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-2"
                      onClick={() => {
                        const url = `/reportes/historial-alumno?alumnoId=${alumno.id}&auto=true`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Clock size={18} />
                      Historial Académico
                    </button>
                  </div>
                </div>
                
                <hr className="my-4" />
                
                <div className="alert alert-info">
                  <strong>💡 Tip:</strong> Los reportes se abrirán en una nueva pestaña y se generarán automáticamente con la información de <strong>{alumno.nombre} {alumno.apellido}</strong>.
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
        hint={histActual ? "Este alumno ya tiene un curso vigente: solo podés cambiar la división dentro del mismo año y nivel." : undefined}
        obtenerOpciones={async (token) => {
          const lista = await listarCursos(token);
          // Si ya tiene curso vigente, limitar opciones al mismo año (y nivel) para permitir solo cambiar división
          let opciones = Array.isArray(lista) ? lista : [];
          if (histActual?.curso) {
            const anioActual = histActual.curso?.anio;
            const nivelActual = histActual.curso?.nivel;
            if (anioActual != null) {
              opciones = opciones.filter((c) =>
                String(c?.anio) === String(anioActual) &&
                (nivelActual == null || String(c?.nivel) === String(nivelActual))
              );
            }
          }

          // Ordenar por división para que sea más claro elegir
          opciones.sort((a, b) => String(a?.division ?? "").localeCompare(String(b?.division ?? ""), 'es', { numeric: true, sensitivity: 'base' }));

          // Si por algún motivo no hay opciones después del filtro, volver a la lista completa para no bloquear
          const finalList = opciones.length ? opciones : (Array.isArray(lista) ? lista : []);

          return finalList.map((c) => ({
            value: c.id,
            label: getTituloCurso(c),
          }));
        }}
        onAsignar={async (token, cursoIdSeleccionado, alumnoId) => {
          const cicloId = cicloLectivo?.id ?? null;
          const req = { alumnoId, cursoId: cursoIdSeleccionado, cicloLectivoId: cicloId };
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
              { cicloLectivoId: cicloId, cursoId: cursoId || null }
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

      {/* Modal multi-tutores */}
      <ModalAsignarTutores
        show={showTutoresModal}
        onClose={() => setShowTutoresModal(false)}
        alumno={formData}
        token={user?.token}
        onAlumnoActualizado={(nuevo) => setFormData(prev => ({ ...prev, ...nuevo }))}
      />
    </>
  );
}

export default AlumnoDetalle;
