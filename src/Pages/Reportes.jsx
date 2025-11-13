import React from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
// import { useNavigate } from "react-router-dom";
import reportes from "../Components/Reportes/reportesData";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";

export default function Reportes() {
  const { user } = useAuth();
  const categorias = ["Alumnos", "Docentes"];

  // Filtrar reportes según el rol del usuario
  const reportesFiltrados = reportes.filter(reporte => {
    // Si el reporte no tiene roles definidos, lo mostramos (por si acaso)
    if (!reporte.roles || reporte.roles.length === 0) return true;
    
    // Si el usuario tiene el rol necesario, mostramos el reporte
    return reporte.roles.includes(user?.rol);
  });

  return (
    <div className="container mt-5">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-3"><BackButton /></div>
      <h2 className="mb-4 text-center">Reportes del Sistema</h2>
      <p className="text-center text-muted mb-4">
        Accedé a informes completos y estadísticas del desempeño académico de alumnos y docentes. 
        Estos reportes te permiten analizar datos, exportar información y tomar decisiones basadas en resultados concretos.
      </p>

      {categorias.map((categoria) => {
        const reportesDeCategoria = reportesFiltrados.filter((r) => r.categoria === categoria);
        
        // Solo mostrar la categoría si tiene reportes disponibles para este rol
        if (reportesDeCategoria.length === 0) return null;

        return (
          <div key={categoria} className="mb-5">
            <h3 className="mb-3">{categoria}</h3>
            <Row xs={1} md={2} lg={3} className="g-4">
              {reportesDeCategoria.map((reporte) => (
                <Col key={reporte.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <Card.Title>{reporte.titulo}</Card.Title>
                      <Card.Text className="flex-grow-1">{reporte.descripcion}</Card.Text>
                      <div className="mt-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const ruta = reporte.ruta
                              || (reporte.titulo === "Notas por Curso/Materia" ? "/reportes/notas-por-curso" : null)
                              || (reporte.titulo === "Notas de un Alumno" ? "/reportes/notas-alumnos" : null);
                            if (ruta) {
                              window.open(ruta, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          Ver más
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        );
      })}
    </div>
  );
}
