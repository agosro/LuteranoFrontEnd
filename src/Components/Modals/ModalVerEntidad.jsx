import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import VistaEntidad from "../VistaEntidad";

export default function ModalVerEntidad({ show, onClose, datos, campos, titulo, detallePathBase }) {
  const navigate = useNavigate();

  if (!show || !datos) return null;

  const handleVerDetalle = (e) => {
    e.preventDefault();
    const url = `/${detallePathBase}/${datos.id}`;
    
    // Click con rueda del mouse (button === 1) o Ctrl+Click o click derecho "abrir en nueva pestaña"
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      window.open(url, '_blank');
    } else {
      // Click normal (button === 0) - pasar datos completos en el state
      navigate(url, { state: datos });
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
            onMouseDown={handleVerDetalle}
            onAuxClick={handleVerDetalle}
            style={{ cursor: 'pointer' }}
            title="Click normal: abre aquí | Rueda del mouse o Ctrl+Click: abre en nueva pestaña"
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
