import { useEffect, useState } from "react";
import { listarCursos } from "../Services/CursoService";
import { getModulosConEstadoSemana } from "../Services/ModuloService";
import { useAuth } from "../Context/AuthContext";
import { Table, Badge, Button, Spinner } from "react-bootstrap";
import BackButton from "../Components/Botones/BackButton";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import "../Components/tabla.css";

export default function Horarios() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCursosConEstado = async () => {
      try {
        const data = await listarCursos(user.token);

        const cursosConEstado = await Promise.all(
          data.map(async (curso) => {
            try {
              // Obtener módulos de toda la semana con su estado
              const respuesta = await getModulosConEstadoSemana(user.token, curso.id);
              
              // Nuevo algoritmo: evaluamos día por día el rango ocupado real
              let algunOcupado = false;
              let algunLibreDentroDeRango = false;

              // La respuesta tiene: { code, mensaje, modulosPorDia: { LUNES: [...], MARTES: [...], ... } }
              const modulosPorDia = respuesta.modulosPorDia || respuesta;
              
              // Iterar sobre los días (LUNES, MARTES, etc.)
              if (modulosPorDia && typeof modulosPorDia === 'object') {
                Object.values(modulosPorDia).forEach((modulosDia) => {
                  if (Array.isArray(modulosDia)) {
                    const efectivos = modulosDia.filter(m => m?.modulo?.id != null);
                    if (efectivos.length === 0) return;
                    const indicesOcupados = efectivos
                      .map((m, idx) => (m.ocupado ? idx : -1))
                      .filter(i => i !== -1);
                    if (indicesOcupados.length === 0) return; // día sin ocupación => no cuenta para completado
                    algunOcupado = true;
                    const minIdx = Math.min(...indicesOcupados);
                    const maxIdx = Math.max(...indicesOcupados);
                    for (let i = minIdx; i <= maxIdx; i++) {
                      if (!efectivos[i].ocupado) {
                        algunLibreDentroDeRango = true;
                        break;
                      }
                    }
                  }
                });
              }

              // Determinar estado según ocupación
              let estado;
              if (!algunOcupado) {
                estado = "Sin asignar";
              } else if (algunLibreDentroDeRango) {
                estado = "Incompleto";
              } else {
                // Nuevo criterio: si globalmente sólo hay 1 módulo ocupado en toda la semana => Incompleto
                const totalOcupadosSemana = Object.values(modulosPorDia || {}).reduce((acc, diaArr) => {
                  if (Array.isArray(diaArr)) {
                    return acc + diaArr.filter(m => m?.ocupado).length;
                  }
                  return acc;
                }, 0);
                estado = totalOcupadosSemana <= 1 ? 'Incompleto' : 'Completado';
              }

              return {
                ...curso,
                cursoNombre: `${curso.anio}°${curso.division}`,
                estadoHorario: estado,
              };
            } catch (error) {
              console.error(`Error al obtener estado de horario del curso ${curso.id}:`, error);
              return {
                ...curso,
                cursoNombre: `${curso.anio}°${curso.division}`,
                estadoHorario: "Sin asignar",
              };
            }
          })
        );

        // Ordenar: primero por anio numérico asc, luego por división (alfanum) asc
        const ordenados = [...cursosConEstado].sort((a, b) => {
          const anioA = parseInt(a.anio, 10) || 0;
          const anioB = parseInt(b.anio, 10) || 0;
          if (anioA !== anioB) return anioA - anioB;
          // Normalizar división (ej: 'A', 'B', '1A')
            const divA = (a.division || a.cursoNombre || '').toString();
            const divB = (b.division || b.cursoNombre || '').toString();
          return divA.localeCompare(divB, 'es', { numeric: true, sensitivity: 'base' });
        });
        setCursos(ordenados);
      } catch (error) {
        console.error("Error al listar cursos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) fetchCursosConEstado();
  }, [user]);

  const handleGestionar = (curso) => {
    const snapshot = btoa(encodeURIComponent(JSON.stringify({
      id: curso.id,
      anio: curso.anio,
      division: curso.division,
      nivel: curso.nivel
    })));
    const params = new URLSearchParams({ s: snapshot });
    const url = `/cursos/${curso.id}/horarios?${params.toString()}`;
    window.open(url, '_blank', 'noopener');
  };

  const renderEstadoBadge = (estado) => {
    const variantes = {
      Completado: "success",
      Incompleto: "warning",
      "Sin asignar": "danger",
    };
    return <Badge bg={variantes[estado]}>{estado}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" variant="primary" className="me-2" />
          <span className="text-muted">Cargando horarios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ position: "relative" }}>
      {/* 🔹 Encabezado */}
      <div className="mb-3">
        {/* Breadcrumbs + volver */}
        <div className="d-flex flex-column align-items-start">
          <Breadcrumbs />
          <BackButton />
        </div>

        {/* Título + subtítulo centrados */}
        <div className="text-center">
          <h2 className="tabla-titulo m-0">Gestión de Horarios</h2>
          <p className="text-muted tabla-subtitulo m-1">
            Aquí puedes ver y gestionar los horarios de cada curso del sistema.
          </p>
        </div>
      </div>

      {/* 🔹 Card de tabla */}
      <div className="tabla-visual-externa">
        <div className="table-responsive">
          <Table bordered hover>
            <thead className="table-primary text-center">
              <tr>
                <th>Curso</th>
                <th>Nivel</th>
                <th>Estado del Horario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cursos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted p-4">
                    No hay cursos disponibles
                  </td>
                </tr>
              ) : (
                cursos.map((curso) => (
                  <tr key={curso.id}>
                    <td className="text-center">{curso.cursoNombre}</td>
                    <td className="text-center">{curso.nivel}</td>
                    <td className="text-center">{renderEstadoBadge(curso.estadoHorario)}</td>
                    <td className="text-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleGestionar(curso)}
                      >
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
