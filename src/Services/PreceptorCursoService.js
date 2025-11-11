import { httpClient } from './httpClient'

const parseCursoResponse = (data, defaultErrorMsg) => {
  if (!data) throw new Error(defaultErrorMsg)
  if (typeof data.code !== 'undefined' && data.code < 0) {
    throw new Error(data.mensaje || defaultErrorMsg)
  }
  return data
}

// Asignar preceptor a curso
export const asignarPreceptorACurso = async (token, cursoId, preceptorId) => {
  void token
  const data = await httpClient.post(`/preceptorCurso/${cursoId}/preceptor/${preceptorId}`)
  return parseCursoResponse(data, 'Error al asignar preceptor al curso')
};

// Desasignar preceptor de curso
export const desasignarPreceptorDeCurso = async (token, cursoId) => {
  void token
  const data = await httpClient.delete(`/preceptorCurso/${cursoId}/preceptor`)
  return parseCursoResponse(data, 'Error al desasignar preceptor del curso')
};
