// Lista de opciones posibles para el enum Nivel
// Deben coincidir con los valores que tu backend espera (por ejemplo: PRIMARIO, SECUNDARIO, etc.)
const nivelesOptions = [
  { value: 'BASICO', label: 'Basico' },
  { value: 'ORIENTADO', label: 'Orientado' },
];

export const camposMateria = (soloLectura = false) => [
  {
    name: 'nombreMateria',
    label: 'Nombre de la materia',
    type: 'text',
    placeholder: 'Ingrese el nombre',
    required: true,
    readOnly: soloLectura,
  },
  {
    name: 'descripcion',
    label: 'Descripción',
    type: 'textarea',
    placeholder: 'Ingrese la descripción de la materia',
    required: true,
    readOnly: soloLectura,
  },
  {
    name: 'nivel',
    label: 'Nivel',
    type: 'select',
    options: nivelesOptions,
    required: true,
    readOnly: soloLectura,
  },
  // Si en el modal quieres seleccionar cursos, se puede agregar un multiselect aquí:
  // {
  //   name: 'cursosIds',
  //   label: 'Cursos asignados',
  //   type: 'multiselect',
  //   options: cursosOptions, // Esto vendría de un useEffect que cargue cursos desde el backend
  //   readOnly: soloLectura,
  // },
];
