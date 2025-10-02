import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import { camposAlumno } from "../Entidades/camposAlumno";
import { editarAlumno } from "../Services/AlumnoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { inputLocalToBackendISO, isoToDisplay } from "../utils/fechas";
import { listarHistorialAlumnoFiltrado, obtenerHistorialActualAlumno } from "../Services/HistorialCursoService";

export default function AlumnoDetalle() {
  const location = useLocation();
  const alumno = location.state;
  const { user } = useAuth();

  const [formData, setFormData] = useState(alumno || {});
  const [historial, setHistorial] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState("");
  const [histActual, setHistActual] = useState(null);
  const [histActualLoading, setHistActualLoading] = useState(true);
  const [histActualError, setHistActualError] = useState("");

  // Filtros opcionales que respeta el backend: cicloLectivoId y cursoId
  const [cicloLectivoId, setCicloLectivoId] = useState("");
  const [cursoId, setCursoId] = useState("");

  // Historial completo (lista), con filtros opcionales
  useEffect(() => {
    const fetchHistorial = async () => {
      if (!user?.token || !alumno?.id) return;
      setHistLoading(true);
      setHistError("");
      try {
        const filtros = {
          cicloLectivoId: cicloLectivoId || undefined,
          cursoId: cursoId || undefined,
        };
        const data = await listarHistorialAlumnoFiltrado(user.token, alumno.id, filtros);
        // Esperamos un objeto tipo { code, mensaje, historialCursoDtos }
        const lista = Array.isArray(data?.historialCursoDtos) ? data.historialCursoDtos : [];
        setHistorial(lista);
      } catch (e) {
        console.error(e);
        setHistError(e.message || "Error cargando historial");
      } finally {
        setHistLoading(false);
      }
    };
    fetchHistorial();
  }, [user?.token, alumno?.id, cicloLectivoId, cursoId]);

  // Historial actual (curso vigente)
  useEffect(() => {
    const fetchActual = async () => {
      if (!user?.token || !alumno?.id) return;
      setHistActualLoading(true);
      setHistActualError("");
      try {
        const data = await obtenerHistorialActualAlumno(user.token, alumno.id);
        // Esperamos { code, mensaje, historialCursoDto }
        setHistActual(data?.historialCursoDto || null);
      } catch (e) {
        console.error(e);
        setHistActualError(e.message || "Error cargando curso vigente");
      } finally {
        setHistActualLoading(false);
      }
    };
    fetchActual();
  }, [user?.token, alumno?.id]);

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
    setFormData(alumno); // descartar cambios
  };

  return (
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
              <RenderCamposEditable
                campos={camposAlumno(false, true)} // 👈 modo edición
                formData={formData}
                setFormData={setFormData}
              />
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
                            <strong>{histActual.cursoNombre || histActual.nombreCurso || `Curso ${histActual.cursoId || ""}`}</strong>
                            {" "}
                            <span className="text-muted">({histActual.cicloLectivoNombre || histActual.cicloLectivo || ""})</span>
                            <div className="small text-muted">
                              {histActual.division ? `División: ${histActual.division}` : ""}
                              {histActual.turno ? `${histActual.division ? " • " : ""}Turno: ${histActual.turno}` : ""}
                            </div>
                          </div>
                          <div className="text-end small">
                            {histActual.fechaInicio ? `Inicio: ${isoToDisplay(histActual.fechaInicio)}` : ""}
                            {histActual.fechaFin ? ` • Fin: ${isoToDisplay(histActual.fechaFin)}` : ""}
                            <div className="fw-semibold">{histActual.estado || ""}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>No tiene curso vigente</p>
                  )
                )}
              </div>

              {/* Filtros */}
              <div className="card mb-3">
                <div className="card-body py-2">
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-4">
                      <label className="form-label mb-1">Ciclo Lectivo ID</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Ej: 2025"
                        value={cicloLectivoId}
                        onChange={(e) => setCicloLectivoId(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label mb-1">Curso ID</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Ej: 3"
                        value={cursoId}
                        onChange={(e) => setCursoId(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setCicloLectivoId(""); setCursoId(""); }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial completo */}
              {histLoading && <p>Cargando historial...</p>}
              {histError && <p className="text-danger">{histError}</p>}
              {!histLoading && !histError && (
                historial.length ? (
                  <ul className="list-group">
                    {historial.map((h) => {
                      const titulo = h.cursoNombre || h.nombreCurso || `Curso ${h.cursoId || ""}`;
                      const sub = h.cicloLectivoNombre || h.cicloLectivo || "";
                      const detalleIzq = [
                        h.division ? `División: ${h.division}` : null,
                        h.turno ? `Turno: ${h.turno}` : null,
                      ].filter(Boolean).join(" • ");
                      const fechas = [
                        h.fechaInicio ? `Inicio: ${isoToDisplay(h.fechaInicio)}` : null,
                        h.fechaFin ? `Fin: ${isoToDisplay(h.fechaFin)}` : null,
                      ].filter(Boolean).join(" • ");
                      return (
                        <li key={h.id || `${h.cursoId}-${sub}`}
                            className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <div><strong>{titulo}</strong>{" "}<span className="text-muted">({sub})</span></div>
                            {detalleIzq && <div className="small text-muted">{detalleIzq}</div>}
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
      ]}
    />
  );
}