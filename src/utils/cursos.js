export const getTituloCurso = (curso) => {
  if (!curso) return "Curso sin asignar";
  const anio = curso.anio ?? "";
  const division = curso.division ?? "";
  if (!anio && !division) return "Curso sin asignar";
  return `${anio}°${division}`;
};