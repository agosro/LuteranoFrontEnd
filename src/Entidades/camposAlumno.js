// camposAlumno.js
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
    { name: "email", label: "Email", type: "email", required: true, readOnly: modoVista },
    { name: "direccion", label: "Dirección", type: "text", required: true, readOnly: modoVista },
    { name: "telefono", label: "Teléfono", type: "text", required: true, readOnly: modoVista },
    { name: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true, readOnly: modoVista },
    { name: "fechaIngreso", label: "Fecha de ingreso", type: "date", required: true, readOnly: modoVista },
  ];

  // 👉 Tutor y curso solo se muestran si NO es creación
  if (!esCreacion) {
    camposBase.push(
      { name: "tutor", label: "Tutor", type: "custom", required: false, readOnly: true, render: (val) => val ? `${val.nombre} ${val.apellido}` : "-" },
      { name: "cursoActual", label: "Curso Actual", type: "custom", required: false, readOnly: true, render: (val) => val ? val.nombre || val.id : "-" }
    );
  }

  return camposBase;
};
