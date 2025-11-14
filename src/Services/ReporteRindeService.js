import { httpClient } from './httpClient'

// GET /reporteRinde/cursos/{cursoId}/rinden?anio=YYYY
export const listarRindenPorCurso = async (token, { cursoId, anio }) => {
  if (!cursoId) throw new Error('cursoId es obligatorio');
  if (!anio) throw new Error('anio es obligatorio');
  const url = `/reporteRinde/cursos/${cursoId}/rinden?anio=${encodeURIComponent(anio)}`
  void token
  return httpClient.get(url)
};

// GET /reporteRinde/cursos/{cursoId}/todos?anio=YYYY
export const listarTodosLosAlumnosPorCurso = async (token, { cursoId, anio }) => {
  if (!cursoId) throw new Error('cursoId es obligatorio');
  if (!anio) throw new Error('anio es obligatorio');
  const url = `/reporteRinde/cursos/${cursoId}/todos?anio=${encodeURIComponent(anio)}`
  void token
  return httpClient.get(url)
};
