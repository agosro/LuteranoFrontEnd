import React, { useState } from "react";
import { Table, Button, Badge } from "react-bootstrap";

export default function GestionarReservas() {
  // 🔹 Datos de ejemplo (mock)
  const [reservas, setReservas] = useState([
    {
      id: 1,
      usuario: "Docente Juan Pérez",
      espacio: { nombre: "Aula 101" },
      fecha: "2025-09-20",
      hora: "08:00",
      estado: "PENDIENTE",
    },
    {
      id: 2,
      usuario: "Docente María López",
      espacio: { nombre: "Laboratorio" },
      fecha: "2025-09-22",
      hora: "10:00",
      estado: "APROBADA",
    },
    {
      id: 3,
      usuario: "Docente Ana Torres",
      espacio: { nombre: "Gimnasio" },
      fecha: "2025-09-23",
      hora: "12:00",
      estado: "DENEGADA",
    },
  ]);

  // 🔹 Cambiar estado de una reserva
  const cambiarEstado = (id, nuevoEstado) => {
    setReservas((prev) =>
      prev.map((reserva) =>
        reserva.id === id ? { ...reserva, estado: nuevoEstado } : reserva
      )
    );
  };

  const renderEstado = (estado) => {
    switch (estado) {
      case "APROBADA":
        return <Badge bg="success">Aprobada</Badge>;
      case "PENDIENTE":
        return <Badge bg="warning">Pendiente</Badge>;
      case "DENEGADA":
        return <Badge bg="danger">Denegada</Badge>;
      default:
        return <Badge bg="secondary">{estado}</Badge>;
    }
  };

  return (
    <div className="container mt-4">
      <h2>Gestionar Reservas</h2>
      {reservas.length === 0 ? (
        <p>No hay reservas registradas.</p>
      ) : (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Espacio</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td>{reserva.usuario}</td>
                <td>{reserva.espacio.nombre}</td>
                <td>{reserva.fecha}</td>
                <td>{reserva.hora}</td>
                <td>{renderEstado(reserva.estado)}</td>
                <td>
                  {reserva.estado === "PENDIENTE" && (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        className="me-2"
                        onClick={() => cambiarEstado(reserva.id, "APROBADA")}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => cambiarEstado(reserva.id, "DENEGADA")}
                      >
                        Denegar
                      </Button>
                    </>
                  )}
                  {reserva.estado !== "PENDIENTE" && (
                    <span className="text-muted">Sin acciones</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
