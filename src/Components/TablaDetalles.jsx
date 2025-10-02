import { useState } from "react";
import { Nav, Tab, Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "./Botones/Breadcrumbs";

export default function TablaDetalle({
  titulo,
  subtitulo,
  tabs,
  onSave,    // 👈 callback guardar
  onCancel,  // 👈 callback cancelar
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.id || "");
  const [modoEditar, setModoEditar] = useState(false);
  const navigate = useNavigate();

  const handleSave = () => {
    if (onSave) onSave();
    setModoEditar(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    setModoEditar(false);
  };

  return (
    <Container className="p-4 bg-white rounded shadow-sm">
      {/* Migas de pan */}
      <div className="mb-3">
        <Breadcrumbs />
      </div>

      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h2 className="mb-1">{titulo}</h2>
          {subtitulo && <p className="text-muted">{subtitulo}</p>}
        </div>

        <div>
          {/* Botón volver atrás */}
          <Button variant="outline-secondary" className="me-2" onClick={() => navigate(-1)}>
            ← Volver
          </Button>

          {!modoEditar ? (
            <Button variant="primary" onClick={() => setModoEditar(true)}>
              Editar
            </Button>
          ) : (
            <>
              <Button
                variant="success"
                className="me-2"
                onClick={handleSave}
              >
                Guardar
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs de Bootstrap */}
      <Tab.Container activeKey={activeKey} onSelect={(k) => setActiveKey(k)}>
        <Nav variant="tabs">
          {tabs.map((tab) => (
            <Nav.Item key={tab.id}>
              <Nav.Link eventKey={tab.id}>{tab.label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content className="mt-3">
          {tabs.map((tab) => (
            <Tab.Pane eventKey={tab.id} key={tab.id}>
              {typeof tab.content === "function"
                ? tab.content(modoEditar)
                : tab.content}
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}
