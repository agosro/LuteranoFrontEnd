import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposPreceptor } from "../Entidades/camposPreceptor";
import { editarPreceptor, listarPreceptores } from "../Services/PreceptorService"; // 👈 services
import { listarCursosPorPreceptor } from "../Services/CursoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function PreceptorDetalle() {
  const location = useLocation();
  const { id } = useParams();
  const preceptorState = location.state;
  const { user } = useAuth();

  const [preceptor, setPreceptor] = useState(preceptorState || null);
  const [formData, setFormData] = useState(preceptorState || {});

  // Cargar preceptor si no viene por state y enriquecer cursos a cargo
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token) return;
      try {
        let p = preceptorState;
        if (!p && id) {
          const lista = await listarPreceptores(user.token);
          p = (lista || []).find(x => String(x.id) === String(id)) || null;
        }
        if (p) {
          // traer cursos a cargo siempre desde el backend
          try {
            const cursos = await listarCursosPorPreceptor(user.token, p.id);
            p = { ...p, cursos: Array.isArray(cursos) ? cursos : (p.cursos || []) };
          } catch {
            // continuar con lo que haya
          }
          setPreceptor(p);
          setFormData(p);
        }
      } catch {
        // silencioso
      }
    };
    fetchData();
  }, [user?.token, id, preceptorState]);

  if (!preceptor) return <p>Cargando...</p>;

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

      await editarPreceptor(user.token, payload);
      toast.success("Preceptor actualizado con éxito");
    } catch (error) {
      toast.error(error.message || "Error actualizando preceptor");
    }
  };

  const handleCancel = () => {
    setFormData(preceptor);
  };

  return (
    <TablaDetalle
      titulo={`${preceptor.nombre} ${preceptor.apellido}`}
      subtitulo={`DNI: ${preceptor.dni}`}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
          id: "datos",
          label: "Datos personales",
          content: (modoEditar) =>
            !modoEditar ? (
              <RenderCampos campos={camposPreceptor([], true)} data={formData} />
            ) : (
              <RenderCamposEditable
                campos={camposPreceptor([], false, true)}
                formData={formData}
                setFormData={setFormData}
              />
            ),
        },
        {
          id: "cursos",
          label: "Cursos a cargo",
          content: () =>
            preceptor.cursos?.length ? (
              <ul className="list-group">
                {preceptor.cursos.map((c) => (
                  <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      {(c.anio ?? "") + " " + (c.division ?? "")} {c.cicloLectivo ? `(${c.cicloLectivo})` : ""}
                    </div>
                    <div>
                      <Link
                        to={`/cursos/${c.id}`}
                        state={{
                          id: c.id,
                          anio: c.anio ?? c.anioCurso ?? c.grado ?? "",
                          division: c.division ?? c.div ?? c.seccion ?? "",
                          nivel: c.nivel ?? c.nivelEducativo ?? "",
                          aulaId: c.aula?.id ?? c.aulaId ?? undefined,
                          aulaNombre: c.aula?.nombre ?? c.aulaNombre ?? undefined,
                          preceptor: preceptor ? { id: preceptor.id, nombre: preceptor.nombre, apellido: preceptor.apellido } : undefined,
                        }}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tiene cursos asignados</p>
            ),
        },
      ]}
    />
  );
}
