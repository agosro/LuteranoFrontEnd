import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposTutor } from "../Entidades/camposTutor";
import { listarTutores, editarTutor } from "../Services/TutorService";
import { listarAlumnosACargo } from "../Services/TutorAlumnoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function TutorDetalle() {
  const location = useLocation();
  const { id } = useParams();
  const tutorState = location.state;
  const { user } = useAuth();

  const [tutor, setTutor] = useState(tutorState || null);
  const [formData, setFormData] = useState(tutorState || {});
  const [loadingTutor, setLoadingTutor] = useState(true);
  const [alumnosCargo, setAlumnosCargo] = useState([]);
  const [alumnosCargoLoading, setAlumnosCargoLoading] = useState(false);
  const [alumnosCargoError, setAlumnosCargoError] = useState("");

  // Cargar tutor (siempre intentamos enriquecer con datos completos)
  useEffect(() => {
    const fetchTutor = async () => {
      if (!user?.token) return;
      try {
        setLoadingTutor(true);
        const lista = await listarTutores(user.token);
        const t = (lista || []).find(x => String(x.id) === String(id)) || null;
        if (t) {
          setTutor(t);
          setFormData(t);
          setLoadingTutor(false);
        } else if (tutorState) {
          // fallback al state si no se encontró en el listado
          setTutor(tutorState);
          setFormData(tutorState);
          setLoadingTutor(false);
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Error cargando tutor");
        if (tutorState) {
          setTutor(tutorState);
          setFormData(tutorState);
          setLoadingTutor(false);
        }
      }
    };
    fetchTutor();
  }, [user?.token, id, tutorState]);

  // Cargar alumnos a cargo del tutor
  useEffect(() => {
    const fetchAlumnos = async () => {
      if (!user?.token || !id) return;
      setAlumnosCargoLoading(true);
      setAlumnosCargoError("");
      try {
        const lista = await listarAlumnosACargo(user.token, id);
        setAlumnosCargo(Array.isArray(lista) ? lista : []);
      } catch (e) {
        console.error(e);
        setAlumnosCargoError(e.message || "Error cargando alumnos a cargo");
      } finally {
        setAlumnosCargoLoading(false);
      }
    };
    fetchAlumnos();
  }, [user?.token, id]);

  if (!tutor && !tutorState) return <p>Cargando...</p>;
  const tShow = tutor || tutorState;

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        genero: formData.genero,
        tipoDoc: formData.tipoDoc || "DNI",
        dni: formData.dni,
        email: formData.email,
        direccion: formData.direccion,
        telefono: formData.telefono,
        fechaNacimiento: inputLocalToBackendISO(formData.fechaNacimiento) || undefined,
        fechaIngreso: inputLocalToBackendISO(formData.fechaIngreso) || undefined,
      };

      await editarTutor(payload, user.token);
      toast.success("Tutor actualizado con éxito");
      setTutor(prev => ({ ...prev, ...payload }));
    } catch (e) {
      toast.error(e.message || "Error actualizando tutor");
    }
  };

  const handleCancel = () => {
    setFormData(tShow);
  };

  const subtitulo = (() => {
    const parts = [];
    if (tShow.dni) parts.push(`DNI: ${tShow.dni}`);
    if (tShow.telefono) parts.push(`Tel: ${tShow.telefono}`);
    return parts.join(' • ');
  })();

  // Vista completa del tutor (todos los campos)

  return (
    <TablaDetalle
      titulo={`${tShow.nombre} ${tShow.apellido}`}
      subtitulo={subtitulo}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
          id: "datos",
          label: "Datos del tutor",
          content: (modoEditar) =>
            !modoEditar ? (
              loadingTutor ? (
                <p>Cargando datos del tutor...</p>
              ) : (
                <RenderCampos campos={camposTutor(true)} data={formData} />
              )
            ) : (
              <RenderCamposEditable campos={camposTutor(false)} formData={formData} setFormData={setFormData} />
            ),
        },
        {
          id: "alumnos",
          label: "Alumnos a cargo",
          content: () => (
            <div>
              {alumnosCargoLoading && <p>Cargando alumnos a cargo...</p>}
              {alumnosCargoError && <p className="text-danger">{alumnosCargoError}</p>}
              {!alumnosCargoLoading && !alumnosCargoError && (
                alumnosCargo.length ? (
                  <ul className="list-group">
                    {alumnosCargo.map((a) => (
                      <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{a.nombre} {a.apellido}</strong>
                          {a.dni ? <span className="text-muted"> • DNI: {a.dni}</span> : null}
                        </div>
                        <div className="text-end">
                          {a.email ? <div className="small text-muted">{a.email}</div> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Este tutor no tiene alumnos a cargo.</p>
                )
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
