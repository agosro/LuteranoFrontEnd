// src/Entidades/camposTutor.js

export const camposTutor = (modoVista = false) => [
  {
    name: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "apellido",
    label: "Apellido",
    type: "text",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "genero",
    label: "Género",
    type: "select",
    opciones: [
      { label: "Masculino", value: "MASCULINO" },
      { label: "Femenino", value: "FEMENINO" },
      { label: "Otro", value: "OTRO" },
    ],
    required: true,
    readOnly: modoVista,
  },
  {
    name: "tipoDoc",
    label: "Tipo de Documento",
    type: "select",
    opciones: [
      { label: "DNI", value: "DNI" },
    ],
    required: true,
    readOnly: modoVista,
  },
  {
    name: "dni",
    label: "Número de Documento",
    type: "text",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "email",
    label: "Correo Electrónico",
    type: "email",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "direccion",
    label: "Dirección",
    type: "text",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "telefono",
    label: "Teléfono",
    type: "text",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "fechaNacimiento",
    label: "Fecha de Nacimiento",
    type: "date",
    required: true,
    readOnly: modoVista,
  },
  {
    name: "fechaIngreso",
    label: "Fecha de Ingreso",
    type: "date",
    required: true,
    readOnly: modoVista,
  },
];