import { httpClient } from './httpClient'

export async function obtenerInformeAnualAlumno(token, alumnoId, anio) {
  void token
  const url = `/reporteAnual/alumnos/${alumnoId}?anio=${encodeURIComponent(anio)}`
  const data = await httpClient.get(url)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al obtener informe anual')
  return data
}
