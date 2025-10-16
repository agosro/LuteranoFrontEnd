import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposAula } from "../Entidades/camposAula";
import { editarAula, obtenerAulaPorId } from "../Services/AulaService";
import { listarCursos } from "../Services/CursoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { getTituloCurso } from "../utils/cursos";

export default function AulaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const aulaState = location.state;
  const { user } = useAuth();
  const token = user?.token;

  const [aula, setAula] = useState(aulaState || null);
  const [formData, setFormData] = useState(aulaState || {});
  const [cursosOptions, setCursosOptions] = useState([]);
  const [loading, setLoading] = useState(!aulaState);

  useEffect(() => {
    if (!token) return;

    const cargarDatos = async () => {
      try {
        // Cargar cursos para mostrar el curso asignado
        const cursosData = await listarCursos(token);
        const opciones = (cursosData || []).map(c => ({
          value: c.id,
          label: getTituloCurso(c)
        }));
        setCursosOptions(opciones);

        // Si no vino por state, obtener por id
        if (!aulaState && id) {
          setLoading(true);
          const data = await obtenerAulaPorId(token, id);
          const aulaData = data?.aula || data;
          
          // Mapear curso si existe
          const cursoAsignado = opciones.find(c => c.value === aulaData.cursoId);
          
          const aulaConCurso = {
            ...aulaData,
            curso: cursoAsignado || null,
            cursoNombre: cursoAsignado?.label || "Sin curso asignado"
          };
          
          setAula(aulaConCurso);
          setFormData(aulaConCurso);
          setLoading(false);
        } else if (aulaState) {
          // Si vino por state, asegurarnos de tener el nombre del curso
          const cursoAsignado = opciones.find(c => c.value === aulaState.cursoId || c.value === aulaState.curso?.value);
          setAula({
            ...aulaState,
            cursoNombre: cursoAsignado?.label || aulaState.cursoNombre || "Sin curso asignado"
          });
          setFormData({
            ...aulaState,
            cursoNombre: cursoAsignado?.label || aulaState.cursoNombre || "Sin curso asignado"
          });
        }
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Error cargando aula");
        setLoading(false);
      }
    };

    cargarDatos();
  }, [token, id, aulaState]);

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        nombre: formData.nombre,
        ubicacion: formData.ubicacion,
        capacidad: formData.capacidad ? Number(formData.capacidad) : null,
        // No enviamos cursoId porque no se edita desde aquí
      };

      const response = await editarAula(token, payload);
      const aulaActualizada = response.aula || response;
      
      // Mantener la info del curso
      const cursoAsignado = cursosOptions.find(c => c.value === aulaActualizada.cursoId);
      const aulaConCurso = {
        ...aulaActualizada,
        curso: cursoAsignado || null,
        cursoNombre: cursoAsignado?.label || "Sin curso asignado"
      };
      
      setAula(aulaConCurso);
      setFormData(aulaConCurso);
      toast.success("Aula actualizada con éxito");
    } catch (error) {
      toast.error(error.message || "Error actualizando aula");
    }
  };

  const handleCancel = () => {
    setFormData(aula);
  };

  if (loading) return <p>Cargando...</p>;
  if (!aula) return <p>No se encontró el aula</p>;

  return (
    <TablaDetalle
      titulo={aula.nombre}
      subtitulo={`Ubicación: ${aula.ubicacion}`}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
          id: "datos",
          label: "Información del aula",
          content: (modoEditar) =>
            !modoEditar ? (
              <RenderCampos 
                campos={camposAula(true, cursosOptions)} 
                data={formData} 
              />
            ) : (
              <RenderCamposEditable
                campos={camposAula(false, cursosOptions)}
                formData={formData}
                setFormData={setFormData}
              />
            ),
        },
      ]}
    />
  );
}
