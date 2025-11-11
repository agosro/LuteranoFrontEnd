import { httpClient } from './httpClient'
const API_URL = '/reporteAsistenciaPerfecta'

export const obtenerAsistenciaPerfecta = async (token, anio) => {
  void token
  return httpClient.get(`${API_URL}?anio=${encodeURIComponent(anio)}`)
};

export default {
  obtenerAsistenciaPerfecta,
};
