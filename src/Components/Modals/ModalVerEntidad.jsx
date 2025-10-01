import React from "react";
import { Modal, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import VistaEntidad from "../VistaEntidad";

export default function ModalVerEntidad({ show, onClose, datos, campos, titulo, detallePathBase }) {
  if (!show || !datos) return null;

  return (
    <Modal show={show} onHide={onClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo || "Detalle"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <VistaEntidad datos={datos} campos={campos} />

        {/* 🔹 Link dinámico */}
        <div className="mt-3 text-end">
          <Link
            to={`/${detallePathBase}/${datos.id}`}
            state={datos}
            className="btn btn-link"
            onClick={onClose}
          >
            Ver detalle completo →
          </Link>
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
