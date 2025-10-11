import { Modal, Button } from "react-bootstrap";

export default function ModalConfirmarEliminacion({ mostrar, onCerrar, alumnoEtiqueta, numeroNota, onConfirmar }) {
  return (
    <Modal show={mostrar} onHide={onCerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {typeof numeroNota !== "undefined" && (
          <p>
            ¿Querés eliminar la Nota {numeroNota}
            {alumnoEtiqueta ? ` de ${alumnoEtiqueta}` : ""}?
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirmar}>
          Eliminar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
