import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

export default function ModalEditarEntidad({ show, onClose, datosIniciales, campos, onSubmit }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (show) {
      setFormData(datosIniciales || {});
    }
  }, [show, datosIniciales]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal show={show} onHide={onClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Editar Usuario</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {campos.map(({ name, label, type, opciones }) => {
            if (type === 'checkbox') {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Check
                    type="checkbox"
                    label={label}
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleChange}
                  />
                </Form.Group>
              );
            }
            if (type === 'select') {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Label>{label}</Form.Label>
                  <Form.Select
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {opciones.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              );
            }
            // Por defecto input tipo texto, email, password, number, etc.
            return (
              <Form.Group key={name} className="mb-3" controlId={name}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type={type || 'text'}
                  name={name}
                  value={formData[name] || ''}
                  onChange={handleChange}
                  required={name !== 'password'} // por ej: la contraseña puede no ser obligatoria en edición
                />
              </Form.Group>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit">Guardar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
