import React from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
// import { useNavigate } from "react-router-dom";
import reportes from "../Components/Reportes/reportesData";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";

export default function Reportes() {
  const categorias = ["Alumnos", "Docentes"];

  return (
    <div className="container mt-5">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-3"><BackButton /></div>
      <h2 className="mb-4 text-center">Reportes del Sistema</h2>

      {categorias.map((categoria) => (
        <div key={categoria} className="mb-5">
          <h3 className="mb-3">{categoria}</h3>
          <Row xs={1} md={2} lg={3} className="g-4">
            {reportes
              .filter((r) => r.categoria === categoria)
              .map((reporte) => (
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
      ))}
    </div>
  );
}
