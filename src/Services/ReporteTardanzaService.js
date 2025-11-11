import { httpClient } from './httpClient'

// GET /reportesTardanza/curso/{cursoId}?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=N
export const listarTardanzasPorCurso = async (token, { cursoId, desde, hasta, limit } = {}) => {
  if (!cursoId) throw new Error('cursoId es obligatorio');
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (limit != null) params.set('limit', String(limit));
  const url = `/reportesTardanza/curso/${cursoId}${params.toString() ? `?${params.toString()}` : ''}`
  void token
  const data = await httpClient.get(url)
  return Array.isArray(data?.items) ? data.items : []
};

// GET /reportesTardanza/todos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=N
export const listarTardanzasTodos = async (token, { desde, hasta, limit } = {}) => {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (limit != null) params.set('limit', String(limit));
  const url = `/reportesTardanza/todos${params.toString() ? `?${params.toString()}` : ''}`
  void token
  const data = await httpClient.get(url)
  return Array.isArray(data?.items) ? data.items : []
};
