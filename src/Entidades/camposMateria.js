
const nivelesOptions = [
  { value: 'BASICO', label: 'Basico' },
  { value: 'ORIENTADO', label: 'Orientado' },
];

export const camposMateria = (soloLectura = false) => {
  const base = [
    {
      name: 'nombreMateria',
      label: 'Nombre de la materia',
      type: 'text',
      placeholder: 'Ingrese el nombre',
      required: true,
      disabled: soloLectura,
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'Ingrese la descripción de la materia',
      required: true,
      disabled: soloLectura,
    },
    {
      name: 'nivel',
      label: 'Nivel',
      type: 'select',
      opciones: nivelesOptions,
      required: true,
      disabled: soloLectura,
    },
  ];

  if (soloLectura) {
    base.push(
      {
        name: 'cursoNombre',
        label: 'Curso',
        type: 'text',
        disabled: true,
      },
      {
        name: 'docenteNombre',
        label: 'Docente',
        type: 'text',
        disabled: true,
      }
    );
  }

  return base;
};