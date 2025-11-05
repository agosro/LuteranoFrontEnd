import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Badge, Spinner, Form } from "react-bootstrap";
import { isoToDisplay } from "../utils/fechas";
import { useAuth } from "../Context/AuthContext";
import { listarReservas, aprobarReserva, denegarReserva } from "../Services/ReservaService";
import { listarEspaciosAulicos } from "../Services/EspacioAulicoService";
import { listarCursos } from "../Services/CursoService";
import { toast } from "react-toastify";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";

export default function GestionarReservas() {
  const { user } = useAuth();
  const token = user?.token;

  const [cargando, setCargando] = useState(true);
  const [reservas, setReservas] = useState([]);
  const [espaciosMap, setEspaciosMap] = useState({});
  const [cursosMap, setCursosMap] = useState({});
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resList, espaciosList, cursosList] = await Promise.all([
        listarReservas(token),
        listarEspaciosAulicos(token).catch(() => []),
        listarCursos(token).catch(() => []),
      ]);
      setReservas(Array.isArray(resList?.reservaEspacioDtos) ? resList.reservaEspacioDtos : []);
      const emap = (espaciosList || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {});
      const cmap = (cursosList || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      setEspaciosMap(emap);
      setCursosMap(cmap);
    } catch (e) {
      toast.error(e?.message || "Error cargando reservas");
      setReservas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (token) cargarDatos(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reservasFiltradas = useMemo(() => {
    if (filtroEstado === "TODOS") return reservas;
    return reservas.filter(r => String(r.estado) === String(filtroEstado));
  }, [reservas, filtroEstado]);

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

  const handleAprobar = async (id) => {
    try {
      await aprobarReserva(id, token);
      toast.success("Reserva aprobada");
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: "APROBADA" } : r));
    } catch (e) {
      toast.error(e?.message || "No se pudo aprobar");
    }
  };

  const handleDenegar = async (id) => {
    const motivo = window.prompt("Motivo de la denegación:");
    if (motivo === null) return; // cancelado
    if (!motivo.trim()) {
      toast.info("Debés ingresar un motivo");
      return;
    }
    try {
      await denegarReserva(id, motivo.trim(), token);
      toast.success("Reserva denegada");
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: "DENEGADA", motivoDenegacion: motivo.trim() } : r));
    } catch (e) {
      toast.error(e?.message || "No se pudo denegar");
    }
  };

  return (
    <div className="container mt-4">
      <Breadcrumbs />
      <BackButton />

      <div className="card mt-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            <h3 className="mb-0">Gestionar Reservas</h3>
            <div className="d-flex align-items-center gap-2">
              <Form.Select size="sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="APROBADA">Aprobadas</option>
                <option value="DENEGADA">Denegadas</option>
              </Form.Select>
              <Button size="sm" variant="outline-secondary" onClick={cargarDatos} disabled={cargando}>
                {cargando ? <Spinner size="sm" /> : "Refrescar"}
              </Button>
            </div>
          </div>

          {cargando ? (
            <div className="mt-3 text-muted">Cargando reservas...</div>
          ) : reservasFiltradas.length === 0 ? (
            <p className="mt-3">No hay reservas registradas.</p>
          ) : (
            <Table striped bordered hover className="mt-3">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Curso</th>
                  <th>Espacio</th>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((r) => {
                  const espacio = espaciosMap[r.espacioAulicoId];
                  const curso = cursosMap[r.cursoId];
                  const cursoLabel = curso ? `${curso.anio ?? ''}°${curso.division ?? ''}` : r.cursoId;
                  const moduloLabel = r.modulo ? `${r.modulo.orden} (${r.modulo.desde} - ${r.modulo.hasta})` : r.moduloId || "";
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{cursoLabel}</td>
                      <td>{espacio?.nombre || r.espacioAulicoId}</td>
                      <td>{isoToDisplay(r.fecha)}</td>
                      <td>{moduloLabel}</td>
                      <td>{renderEstado(r.estado)}</td>
                      <td>
                        {String(r.estado) === "PENDIENTE" ? (
                          <div className="d-flex gap-2">
                            <Button variant="success" size="sm" onClick={() => handleAprobar(r.id)}>Aprobar</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDenegar(r.id)}>Denegar</Button>
                          </div>
                        ) : (
                          <span className="text-muted">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
