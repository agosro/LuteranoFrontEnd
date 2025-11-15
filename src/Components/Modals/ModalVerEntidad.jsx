import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import VistaEntidad from "../VistaEntidad";

export default function ModalVerEntidad({ show, onClose, datos, campos, titulo, detallePathBase }) {
  const navigate = useNavigate();

  if (!show || !datos) return null;

  const handleVerDetalle = (e) => {
    const url = `/${detallePathBase}/${datos.id}`;
    
    // Click con rueda del mouse (button === 1) o Ctrl+Click
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      window.open(url, '_blank');
    } else {
      // Click normal (button === 0)
      navigate(url);
      onClose();
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo || "Detalle"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <VistaEntidad datos={datos} campos={campos} />

        {/* 🔹 Link que funciona con click normal y rueda del mouse */}
        <div className="mt-3 text-end">
          <button
            type="button"
            className="btn btn-link"
            onClick={handleVerDetalle}
            onMouseUp={handleVerDetalle}
            style={{ cursor: 'pointer' }}
            title="Click normal: abre aquí | Rueda del mouse: abre en nueva pestaña"
          >
            Ver detalle completo →
          </button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
