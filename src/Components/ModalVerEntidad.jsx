import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import VistaEntidad from './VistaEntidad';

export default function ModalVerEntidad({ show, onClose, datos, campos, titulo }) {
  return (
    <Modal show={show} onHide={onClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>{titulo || 'Detalle'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Pasamos show a VistaEntidad */}
        <VistaEntidad datos={datos} campos={campos} show={show} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}