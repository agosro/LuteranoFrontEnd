// camposAlumno.js
import { getTituloCurso } from "../utils/cursos";

export const camposAlumno = (modoVista = false, esCreacion = false) => {
  const camposBase = [
    { name: "nombre", label: "Nombre", type: "text", required: true, readOnly: modoVista },
    { name: "apellido", label: "Apellido", type: "text", required: true, readOnly: modoVista },
    { name: "genero", label: "Género", type: "select", opciones: [
        { value: "MASCULINO", label: "Masculino" },
        { value: "FEMENINO", label: "Femenino" },
        { value: "OTRO", label: "Otro" }
      ], required: true, readOnly: modoVista },
    { name: "tipoDoc", label: "Tipo Documento", type: "select", opciones: [
        { value: "DNI", label: "DNI" },
      ], required: true, readOnly: modoVista },
    { name: "dni", label: "DNI", type: "text", required: true, readOnly: modoVista },
    { name: "estado", label: "Estado del Alumno", type: "select", opciones: [
        { value: "REGULAR", label: "Regular" },
        { value: "LIBRE", label: "Libre" },
        { value: "EGRESADO", label: "Egresado" },
        { value: "BORRADO", label: "Borrado" },
        { value: "EXCLUIDO_POR_REPETICION", label: "Excluido por repetición" }
      ], required: false, readOnly: true, skip: !modoVista },
    { name: "email", label: "Email", type: "email", required: true, readOnly: modoVista },
    { name: "direccion", label: "Dirección", type: "text", required: true, readOnly: modoVista },
    { name: "telefono", label: "Teléfono", type: "text", required: true, readOnly: modoVista },
    { name: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true, readOnly: modoVista },
    { name: "fechaIngreso", label: "Fecha de ingreso", type: "date", required: true, readOnly: modoVista },
  ];

  // 👉 Tutores (plural) y curso solo se muestran si NO es creación.
  // Ahora soporta múltiples tutores, se renderiza lista simple.
  if (!esCreacion) {
    camposBase.push(
      {
        name: "tutores",
        label: "Tutores",
        type: "custom",
        required: false,
        readOnly: true,
        render: (val) => {
          if (!val || !Array.isArray(val) || val.length === 0) return "-";
            return val
              .map(t => `${t.apellido ?? ''} ${t.nombre ?? ''}`.trim())
              .join(', ');
        }
      },
      {
        name: "cursoActual",
        label: "Curso Actual",
        type: "custom",
        required: false,
        readOnly: true,
        render: (val) => {
          if (!val) return "-";
          return (
            val.cursoNombre
            || val.nombreCurso
            || val.nombre
            || getTituloCurso({ anio: (val.anio ?? val.anioCurso), division: (val.division ?? undefined) })
            || getTituloCurso(val.curso)
            || (val.cursoId ? `Curso ${val.cursoId}` : (val.id ?? "-"))
          );
        }
      }
    );
  }

  return camposBase;
};
