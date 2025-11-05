import React from "react";
import { Modal, Button, Spinner } from "react-bootstrap";

export default function ModalConfirmar({
  show,
  title = "Confirmar",
  message = "¿Deseás continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "danger",
  onConfirm,
  onClose,
  confirming = false,
}) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {typeof message === "string" ? <p className="mb-0">{message}</p> : message}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={confirming}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={confirming}>
          {confirming ? <Spinner size="sm" /> : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
