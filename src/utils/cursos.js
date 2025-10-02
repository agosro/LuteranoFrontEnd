export const getTituloCurso = (curso) => {
  if (!curso) return "Curso sin asignar";
  return `${curso.anio ?? ""} ${curso.division ?? ""}`.trim();
};