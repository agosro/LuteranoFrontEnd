import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposCurso } from "../Entidades/camposCurso";
import { obtenerCursoPorId, editarCurso } from "../Services/CursoService";
import { listarAulas, listarAulasLibres } from "../Services/AulaService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { getModulosConEstadoPorDia } from "../Services/ModuloService";
import { listarPreceptores } from "../Services/PreceptorService";
import { toast } from "react-toastify";
import { getTituloCurso } from "../utils/cursos";

// Constante estable fuera del componente para evitar re-render deps
const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];

export default function CursoDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cursoState = location.state;
  const { user } = useAuth();
  const token = user?.token;

  const [curso, setCurso] = useState(cursoState || null);
  const [formData, setFormData] = useState(cursoState || {});
  const [loadingCurso, setLoadingCurso] = useState(true);
  const [aulasOptions, setAulasOptions] = useState([]);
  const [aulasLibresOptions, setAulasLibresOptions] = useState([]);
  const [preceptor, setPreceptor] = useState(cursoState?.preceptor || null);
  const [preceptorLoading, setPreceptorLoading] = useState(false);

  const [alumnos, setAlumnos] = useState([]);
  const [alumnosLoading, setAlumnosLoading] = useState(true);
  const [alumnosError, setAlumnosError] = useState("");

  const [materias, setMaterias] = useState([]);
  const [materiasLoading, setMateriasLoading] = useState(true);
  const [materiasError, setMateriasError] = useState("");

  // Horarios solo vista
  const [horarios, setHorarios] = useState({});
  const [horariosLoading, setHorariosLoading] = useState(true);
  const [horariosError, setHorariosError] = useState("");

  // Cargar curso y opciones de aulas
  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      try {
        setLoadingCurso(true);
        // Aulas para selects (todas y libres)
        const aulas = await listarAulas(token);
        const opcionesTodas = (aulas || []).map(a => ({ value: a.id, label: a.nombre }));
        setAulasOptions(opcionesTodas);
        try {
          const aulasLibres = await listarAulasLibres(token);
          setAulasLibresOptions((aulasLibres || []).map(a => ({ value: a.id, label: a.nombre })));
        } catch (e) {
          // Fallback: si falla, usamos todas para no bloquear edición
          setAulasLibresOptions(opcionesTodas);
          toast.error(e.message || "No se pudieron cargar las aulas libres");
        }

        // Si no vino por state, obtener por id
        if (!cursoState && id) {
          const data = await obtenerCursoPorId(token, id);
          const rawCurso = data?.cursoDto || data?.curso || data;
          
          if (rawCurso && rawCurso.id) {
            // Normalizar el objeto curso para que tenga la estructura esperada
            const cursoNormalizado = {
              id: rawCurso.id,
              anio: rawCurso.anio,
              division: rawCurso.division,
              nivel: rawCurso.nivel,
              aula: rawCurso.aula || null,
              aulaId: rawCurso.aula?.id || rawCurso.aulaId || null,
              aulaNombre: rawCurso.aula?.nombre || rawCurso.aulaNombre || "",
              preceptorId: rawCurso.preceptorId || rawCurso.preceptor?.id || null,
              preceptor: rawCurso.preceptor || null,
            };
            
            setCurso(cursoNormalizado);
            setFormData({
              id: cursoNormalizado.id,
              anio: cursoNormalizado.anio,
              division: cursoNormalizado.division,
              nivel: cursoNormalizado.nivel,
              aulaId: (() => {
                const raw = cursoNormalizado.aula?.id ?? cursoNormalizado.aulaId;
                const num = Number(raw);
                return Number.isFinite(num) ? num : "";
              })(),
            });
            // Resolver preceptor si viene el id
            try {
              setPreceptorLoading(true);
              const preceptorId = cursoNormalizado.preceptorId;
              if (preceptorId) {
                const lista = await listarPreceptores(token);
                const p = (lista || []).find(x => x.id === preceptorId) || cursoNormalizado.preceptor || null;
                setPreceptor(p);
              } else {
                setPreceptor(cursoNormalizado.preceptor || null);
              }
            } catch {
              // silencioso
            } finally {
              setPreceptorLoading(false);
            }
          } else {
            toast.error("Curso no encontrado");
            navigate("/cursos");
          }
        } else if (cursoState) {
          setCurso(cursoState);
          setFormData({
            id: cursoState.id,
            anio: cursoState.anio,
            division: cursoState.division,
            nivel: cursoState.nivel,
            aulaId: (() => {
              const raw = cursoState.aula?.value ?? cursoState.aula?.id;
              const num = Number(raw);
              return Number.isFinite(num) ? num : "";
            })(),
          });
          if (cursoState.preceptor) {
            setPreceptor(cursoState.preceptor);
          } else if (cursoState.preceptorId) {
            try {
              setPreceptorLoading(true);
              const lista = await listarPreceptores(token);
              const p = (lista || []).find(x => x.id === cursoState.preceptorId) || null;
              setPreceptor(p);
            } catch {
              // silencioso
            } finally {
              setPreceptorLoading(false);
            }
          } else {
            // Si no vino preceptor en el state, obtener curso completo y resolver
            try {
              setPreceptorLoading(true);
              const data = await obtenerCursoPorId(token, id);
              const cFull = data?.cursoDto || data;
              const preceptorId = cFull?.preceptorId || cFull?.preceptor?.id;
              if (preceptorId) {
                const lista = await listarPreceptores(token);
                const p = (lista || []).find(x => x.id === preceptorId) || cFull?.preceptor || null;
                setPreceptor(p);
              } else {
                setPreceptor(cFull?.preceptor || null);
              }
            } catch {
              // silencioso
            } finally {
              setPreceptorLoading(false);
            }
          }
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Error cargando curso");
        if (!cursoState) {
          navigate("/cursos");
        }
      } finally {
        setLoadingCurso(false);
      }
    };

    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, navigate]);

  // Cargar alumnos del curso (ciclo lectivo activo 1 por ahora)
  useEffect(() => {
    const fetchAlumnos = async () => {
      if (!token || !id) return;
      setAlumnosLoading(true);
      setAlumnosError("");
      try {
        const lista = await listarAlumnosPorCurso(token, id, 1);
        setAlumnos(Array.isArray(lista) ? lista : []);
      } catch (e) {
        console.error(e);
        setAlumnosError(e.message || "Error cargando alumnos del curso");
      } finally {
        setAlumnosLoading(false);
      }
    };
    fetchAlumnos();
  }, [token, id]);

  // Cargar materias del curso
  useEffect(() => {
    const fetchMaterias = async () => {
      if (!token || !id) return;
      setMateriasLoading(true);
      setMateriasError("");
      try {
        const lista = await listarMateriasDeCurso(token, id);
        setMaterias(Array.isArray(lista) ? lista : []);
      } catch (e) {
        console.error(e);
        setMateriasError(e.message || "Error cargando materias del curso");
      } finally {
        setMateriasLoading(false);
      }
    };
    fetchMaterias();
  }, [token, id]);

  // Cargar horarios del curso (solo vista)
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!token || !id) return;
      setHorariosLoading(true);
      setHorariosError("");
      try {
        const dataPorDia = {};
        for (const dia of DIAS_SEMANA) {
          const resp = await getModulosConEstadoPorDia(token, id, dia);
          const modulosDia = resp.modulos || resp.modulosPorDia?.[dia] || [];
          dataPorDia[dia] = modulosDia;
        }
        setHorarios(dataPorDia);
      } catch (e) {
        console.error(e);
        setHorariosError(e.message || "Error cargando horarios del curso");
      } finally {
        setHorariosLoading(false);
      }
    };
    fetchHorarios();
  }, [token, id]);

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        anio: formData.anio,
        division: formData.division,
        nivel: formData.nivel,
        aulaId: formData.aulaId || null,
      };
      await editarCurso(token, payload);
      toast.success("Curso actualizado con éxito");
      // refrescar curso en pantalla
      setCurso((prev) => ({ ...prev, ...payload, aula: payload.aulaId ? { id: payload.aulaId } : null }));
    } catch (e) {
      toast.error(e.message || "Error al actualizar curso");
    }
  };

  const handleCancel = () => {
    if (curso) {
      setFormData({
        id: curso.id,
        anio: curso.anio,
        division: curso.division,
        nivel: curso.nivel,
        aulaId: curso.aula?.id || curso.aulaId || "",
      });
    }
  };

  const titulo = curso ? `Curso ${getTituloCurso(curso)}` : "Curso";

  if (loadingCurso) return <p>Cargando...</p>;
  if (!curso) return <p>Curso no encontrado</p>;

  return (
    <TablaDetalle
      titulo={titulo}
      subtitulo={curso?.nivel ? `Nivel: ${curso.nivel}` : ""}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
          id: "datos",
          label: "Datos del curso",
          content: (modoEditar) =>
            !modoEditar ? (
              <>
                <RenderCampos
                  campos={camposCurso(true, aulasOptions, [], false)}
                  data={{
                    anio: curso?.anio,
                    division: curso?.division,
                    nivel: curso?.nivel,
                    aulaNombre: (() => {
                      const rawId = curso?.aula?.id ?? curso?.aula?.value ?? curso?.aulaId;
                      const idNum = Number(rawId);
                      const label = aulasOptions.find(a => a.value === idNum)?.label;
                      return label || curso?.aulaNombre || "";
                    })(),
                  }}
                />

                {/* Preceptor a cargo */}
                <div className="card p-3 shadow-sm mt-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold mb-1">Preceptor a cargo</div>
                      {preceptorLoading ? (
                        <div className="text-muted">Cargando preceptor...</div>
                      ) : preceptor ? (
                        <div>
                          {preceptor.nombre} {preceptor.apellido}
                        </div>
                      ) : (
                        <div className="text-muted">Sin preceptor asignado</div>
                      )}
                    </div>
                    <div>
                      {!preceptorLoading && preceptor && (
                        <Link
                          to={`/preceptores/${preceptor.id}`}
                          state={preceptor}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver detalle
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <RenderCamposEditable
                campos={(() => {
                  // En modo edición usamos aulas libres + aula actual si no estuviera libre
                  const aulaActualId = (() => {
                    const raw = formData?.aulaId ?? curso?.aula?.id ?? curso?.aula?.value ?? curso?.aulaId;
                    const num = Number(raw);
                    return Number.isFinite(num) ? num : null;
                  })();
                  let opcionesEdit = [...aulasLibresOptions];
                  if (aulaActualId != null && !opcionesEdit.some(o => o.value === aulaActualId)) {
                    const labelActual =
                      aulasOptions.find(o => o.value === aulaActualId)?.label ||
                      curso?.aulaNombre || `Aula ${aulaActualId}`;
                    opcionesEdit = [...opcionesEdit, { value: aulaActualId, label: labelActual }];
                  }
                  return camposCurso(false, opcionesEdit, [], false);
                })()}
                formData={formData}
                setFormData={setFormData}
              />
            ),
        },
        {
          id: "alumnos",
          label: "Alumnos",
          content: () => (
            <div>
              {alumnosLoading && <p>Cargando alumnos...</p>}
              {alumnosError && <p className="text-danger">{alumnosError}</p>}
              {!alumnosLoading && !alumnosError && (
                alumnos.length ? (
                  <>
                    <div className="mb-2">
                      <span className="badge bg-secondary">Total: {alumnos.length}</span>
                    </div>
                  <ul className="list-group">
                    {alumnos.map((a) => (
                      <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{a.nombre} {a.apellido}</strong>
                          {a.email ? <span className="text-muted"> • {a.email}</span> : null}
                        </div>
                        <div className="text-end small">
                          {a.dni ? <span>DNI: {a.dni}</span> : null}
                          <div>
                            <Link to={`/alumnos/${a.id}`} state={a} className="btn btn-sm btn-outline-primary mt-1">
                              Ver alumno
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  </>
                ) : (
                  <p>No hay alumnos asignados a este curso.</p>
                )
              )}
            </div>
          ),
        },
        {
          id: "materias",
          label: "Materias",
          content: () => (
            <div>
              {materiasLoading && <p>Cargando materias...</p>}
              {materiasError && <p className="text-danger">{materiasError}</p>}
              {!materiasLoading && !materiasError && (
                materias.length ? (
                  <ul className="list-group">
                    {materias.map((m) => (
                      <li key={`${m.materiaId}-${m.materiaCursoId || "mc"}`} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{m.nombreMateria}</strong>
                          {m.nivel ? <span className="text-muted"> • {m.nivel}</span> : null}
                        </div>
                        <div className="text-end small">
                          {m.docente ? (
                            <span>Docente: {m.docente.nombre} {m.docente.apellido}</span>
                          ) : (
                            <span className="text-muted">Sin docente</span>
                          )}
                          <div>
                            <Link
                              to={`/materias/${m.materiaId}`}
                              state={m}
                              className="btn btn-sm btn-outline-primary mt-1"
                            >
                              Ver materia
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Este curso no tiene materias asignadas.</p>
                )
              )}
            </div>
          ),
        },
        {
          id: "horarios",
          label: "Horarios",
          content: () => (
            <div>
              {horariosLoading && <p>Cargando horarios...</p>}
              {horariosError && <p className="text-danger">{horariosError}</p>}
              {!horariosLoading && !horariosError && (
                <>
                  <div className="d-flex justify-content-end mb-2">
                    <Link
                      to={`/cursos/${id}/horarios`}
                      state={curso}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Gestionar horarios
                    </Link>
                  </div>
                  <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-success text-center">
                      <tr>
                        <th>Módulo</th>
                        {DIAS_SEMANA.map((dia) => (
                          <th key={dia}>{dia}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const setOrdenes = new Set();
                        DIAS_SEMANA.forEach(dia => {
                          (horarios[dia] || []).forEach(slot => {
                            if (slot?.modulo?.orden != null) setOrdenes.add(slot.modulo.orden);
                          });
                        });
                        const ordenes = Array.from(setOrdenes).sort((a, b) => a - b);
                        return ordenes.map((orden) => {
                          const lunesSlot = (horarios.LUNES || []).find(s => s.modulo.orden === orden);
                          const horaLabel = lunesSlot ? `${lunesSlot.modulo.desde} - ${lunesSlot.modulo.hasta}` : `Módulo ${orden}`;
                          return (
                            <tr key={orden}>
                              <td className="text-center">{horaLabel}</td>
                              {DIAS_SEMANA.map(dia => {
                                const slot = (horarios[dia] || []).find(s => s.modulo.orden === orden);
                                if (!slot) return <td key={`${dia}-${orden}`}></td>;
                                return (
                                  <td key={`${dia}-${orden}`} className={`text-center ${slot.ocupado ? "table-danger" : "table-light"}`}>
                                    {slot.ocupado ? (
                                      <div>
                                        <strong>{slot.horario?.materiaCurso?.materia?.nombreMateria || "Materia"}</strong>
                                        <br />
                                        {slot.horario?.materiaCurso?.docente && (
                                          <small>
                                            {slot.horario.materiaCurso.docente.nombre} {slot.horario.materiaCurso.docente.apellido}
                                          </small>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted">Libre</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
