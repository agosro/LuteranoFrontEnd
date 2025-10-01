import { useState } from "react";
import { useLocation } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposPreceptor } from "../Entidades/camposPreceptor";
import { editarPreceptor } from "../Services/PreceptorService"; // 👈 tu service
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function PreceptorDetalle() {
  const location = useLocation();
  const preceptor = location.state;
  const { user } = useAuth();

  const [formData, setFormData] = useState(preceptor || {});

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
                  <li key={c.id} className="list-group-item">
                    {c.nombre} ({c.cicloLectivo})
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
