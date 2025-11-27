// src/Pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../Context/AuthContext";
// Dashboard inicial: evolucionará a estructura modular con tarjetas y charts.
// Mantener nombre de archivo y ruta '/inicio' según requerimiento.

// ✅ Services existentes
import { listarAlumnos, listarAlumnosEgresados, listarAlumnosExcluidos } from "../Services/AlumnoService";
import { listarDocentes } from "../Services/DocenteService";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { listarReservas } from "../Services/ReservaService";
import { listarAsistenciaCursoPorFecha } from "../Services/AsistenciaAlumnoService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";

import "bootstrap/dist/css/bootstrap.min.css";
import KpiCard from "../Components/Dashboard/KpiCard.jsx";
import ChartCard from "../Components/Dashboard/ChartCard.jsx";
import LoadingSkeleton from "../Components/Dashboard/LoadingSkeleton.jsx";
import SimplePie from "../Components/Dashboard/SimplePie.jsx";
import SimpleBar from "../Components/Dashboard/SimpleBar.jsx";
import useCachedFetch from "../Components/Dashboard/useCachedFetch.js";
import RefreshButton from "../Components/Dashboard/RefreshButton.jsx";

export default function Inicio() {
  const { user } = useAuth();
  const rol = user?.rol || "ROLE_ADMIN";

  return (
    <div className="container-fluid p-4">
      <WelcomeHeader user={user} />

      {rol === "ROLE_ADMIN" && <DashboardAdmin token={user?.token} />}
      {rol === "ROLE_DIRECTOR" && <DashboardDirector token={user?.token} />}
      {rol === "ROLE_DOCENTE" && (
        <DashboardDocente token={user?.token} idDocente={user?.docenteId} />
      )}
      {rol === "ROLE_PRECEPTOR" && (
        <DashboardPreceptor token={user?.token} idPreceptor={user?.preceptorId} />
      )}
      {rol === "ROLE_AUXILIAR" && <DashboardAuxiliar token={user?.token} />}
    </div>
  );
}

//
// 🔹 ADMIN
//
function DashboardAdmin({ token }) {
  const todayFormatted = formatDate(new Date())
  const { data, loading, refresh } = useCachedFetch('adminDashboard', async () => {
    const [alumnos, egresados, excluidos, docentes, cursos] = await Promise.all([
      listarAlumnos(token),
      listarAlumnosEgresados(token).catch(() => []),
      listarAlumnosExcluidos(token).catch(() => []),
      listarDocentes(token),
      listarCursos(token),
    ])
    const activos = Math.max(alumnos.length - egresados.length - excluidos.length, 0)
    
    // Contar alumnos activos por curso
    const alumnosPorCursoMap = new Map()
    alumnos.forEach(alumno => {
      if (!alumno.cursoActual?.id) return
      const count = alumnosPorCursoMap.get(alumno.cursoActual.id) || 0
      alumnosPorCursoMap.set(alumno.cursoActual.id, count + 1)
    })
    
    // Distribución de alumnos por curso (Top 10)
    const alumnosPorCurso = cursos
      .map(c => ({
        name: `${c.anio}° ${c.division || ''}`.trim(),
        value: alumnosPorCursoMap.get(c.id) || 0
      }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    // Contar materias por docente
    const materiasPorDocente = new Map()
    docentes.forEach(docente => {
      const cantidadMaterias = docente.dictados?.length || 0
      if (cantidadMaterias > 0) {
        materiasPorDocente.set(docente.id, {
          nombre: `${docente.nombre || ''} ${docente.apellido || ''}`.trim(),
          value: cantidadMaterias
        })
      }
    })
    
    const docentesPorMateria = Array.from(materiasPorDocente.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map(d => ({ name: d.nombre, value: d.value }))
    
    return {
      stats: { alumnos: alumnos.length, docentes: docentes.length, cursos: cursos.length },
      alumnosPie: [
        { name: 'Activos', value: activos },
        { name: 'Egresados', value: egresados.length },
        { name: 'Excluidos', value: excluidos.length },
      ].filter(x => x.value > 0),
      alumnosPorCurso,
      docentesPorMateria
    }
  }, 5 * 60_000) // TTL 5 min

  if (loading || !data) return <LoadingSkeleton blocks={4} />;
  const { stats, alumnosPie, alumnosPorCurso, docentesPorMateria } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Alumnos" value={stats.alumnos} /></div>
        <div className="col-md-3"><KpiCard title="Docentes" value={stats.docentes} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Cursos" value={stats.cursos} color="#6f42c1" /></div>
        <div className="col-md-3"><KpiCard title="Fecha" value={todayFormatted} color="#fd7e14" hint="Hoy" /></div>
      </div>
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <ChartCard title="Alumnos por estado" right={<RefreshButton onClick={refresh} />}>
            <SimplePie data={alumnosPie || []} />
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title="Alumnos por curso (Top 10)" right={<RefreshButton onClick={refresh} />}>
            {alumnosPorCurso.length > 0 ? (
              <SimpleBar data={alumnosPorCurso} />
            ) : (
              <div className="text-muted">Sin datos disponibles</div>
            )}
          </ChartCard>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-md-12">
          <ChartCard title="Carga docente (Top 8)" right={<RefreshButton onClick={refresh} />}>
            {docentesPorMateria.length > 0 ? (
              <SimpleBar data={docentesPorMateria} />
            ) : (
              <div className="text-muted">Sin datos disponibles</div>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}

// DIRECTOR: similar a Admin pero podría diferir en métricas (placeholder)
function DashboardDirector({ token }) {
  const year = new Date().getFullYear()
  
  const { data, loading, refresh } = useCachedFetch('directorDashboard', async () => {
    const [alumnos, cursos, docentes, rs] = await Promise.all([
      listarAlumnos(token),
      listarCursos(token),
      listarDocentes(token),
      listarReservas(token).catch(() => null),
    ])
    
    const lista = rs ? (Array.isArray(rs?.reservas) ? rs.reservas : Array.isArray(rs?.items) ? rs.items : Array.isArray(rs) ? rs : []) : []
    const pendientes = lista.filter(r => (r.estado || r.status || '').toUpperCase() === 'PENDIENTE').length
    
    // Mesas de examen (simulado con reservas; en el futuro incluir endpoint real)
    const mesasEstaeYear = lista.filter(r => (r.fecha || '').startsWith(String(year)))
    
    return { 
      stats: { alumnos: alumnos.length, cursos: cursos.length, docentes: docentes.length, reservasPendientes: pendientes }, 
      reservas: lista.slice(0,5),
      mesasData: mesasEstaeYear.slice(0, 10)
    }
  }, 3*60_000)

  if (loading || !data) return <LoadingSkeleton blocks={4} />;
  const { stats, reservas, mesasData } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Alumnos" value={stats.alumnos} /></div>
        <div className="col-md-3"><KpiCard title="Cursos" value={stats.cursos} color="#6f42c1" /></div>
        <div className="col-md-3"><KpiCard title="Docentes" value={stats.docentes} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Reservas Pend." value={stats.reservasPendientes} color="#dc3545" /></div>
      </div>
      <div className="row g-4">
        <div className="col-md-6">
          <ChartCard title="Reservas recientes" right={<RefreshButton onClick={refresh} />}>
            {reservas.length === 0 && <div className="text-muted">Sin reservas</div>}
            <ul className="list-group list-group-flush">
              {reservas.map((r,i) => (
                <li key={i} className="list-group-item" style={{fontSize:'0.8rem'}}>
                  {(r.aulaNombre || r.espacio || 'Aula')} - {(r.docenteNombre || r.usuarioNombre || 'Usuario')} - {(r.estado || r.status)}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title={`Mesas de examen ${year}`} right={<RefreshButton onClick={refresh} />}>
            {mesasData.length === 0 && <div className="text-muted">Sin mesas registradas</div>}
            <ul className="list-group list-group-flush">
              {mesasData.map((m,i) => (
                <li key={i} className="list-group-item" style={{fontSize:'0.75rem'}}>
                  <div><strong>{m.materiaNombre || 'Materia'}</strong> - {m.fecha}</div>
                  <div className="text-muted">{m.cursoNombre || 'Curso'} | {m.docenteNombre || 'Docente'}</div>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </>
  )
}

//
// 🔹 DOCENTE
//
function DashboardDocente({ token, idDocente }) {
  const { data, loading, refresh } = useCachedFetch(`docenteDashboard-${idDocente}`, async () => {
    const cursos = await listarCursosPorDocente(token, idDocente)
    
    // Cargar materias y alumnos de cada curso
    const materiasData = await Promise.all(
      cursos.map(c => listarMateriasDeCurso(token, c.id).catch(() => []))
    )
    const alumnosData = await Promise.all(
      cursos.map(c => listarAlumnosPorCurso(token, c.id).catch(() => []))
    )
    
    // Obtener solo las materias que el docente dicta (filtrar como en Calificaciones)
    const materiasDelDocente = []
    materiasData.forEach((materias, cursoIdx) => {
      materias.forEach(m => {
        // Filtrar solo las materias que este docente dicta
        if (m.docente?.id === idDocente || m.docenteId === idDocente) {
          materiasDelDocente.push({
            nombre: m.nombreMateria || m.nombre || `Materia ${m.id}`,
            curso: `${cursos[cursoIdx].anio}° ${cursos[cursoIdx].division}`,
            id: m.id,
            nombreMateria: m.nombreMateria || m.nombre
          })
        }
      })
    })
    
    // Obtener materias únicas (por nombre)
    const materiasUnicas = new Map()
    materiasDelDocente.forEach(m => {
      if (!materiasUnicas.has(m.nombreMateria)) {
        materiasUnicas.set(m.nombreMateria, { nombre: m.nombre, cursos: [m.curso] })
      } else {
        const existing = materiasUnicas.get(m.nombreMateria)
        if (!existing.cursos.includes(m.curso)) {
          existing.cursos.push(m.curso)
        }
      }
    })
    
    const totalMaterias = materiasUnicas.size
    // Sumar correctamente los alumnos de todos los cursos a cargo
    const totalAlumnos = alumnosData.reduce((acc, alumnos) => {
      return acc + (Array.isArray(alumnos) ? alumnos.length : 0)
    }, 0);
    
    // Convertir a array para la gráfica
    const materiasList = Array.from(materiasUnicas.entries()).map(([nombre, data]) => ({
      name: nombre,
      value: data.cursos.length
    }))
    
    return { 
      cursos, 
      totalMaterias,
      totalAlumnos,
      materiasList,
      materiasDelDocente
    }
  }, 4*60_000)

  if (loading || !data) return <LoadingSkeleton blocks={3} />;
  const { cursos, totalMaterias, totalAlumnos, materiasDelDocente } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Mis Cursos" value={cursos.length} /></div>
        <div className="col-md-3"><KpiCard title="Materias asignadas" value={totalMaterias} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Alumnos totales" value={totalAlumnos} color="#6f42c1" /></div>
      </div>
      <div className="row g-4">
        <div className="col-md-6">
          <ChartCard title="Materias asignadas" right={<RefreshButton onClick={refresh} />}>
            {materiasDelDocente.length > 0 ? (
              <ul className="list-group list-group-flush">
                {Array.from(
                  new Map(materiasDelDocente.map(m => [m.nombre + m.curso, m])).values()
                ).map((m, i) => (
                  <li key={i} className="list-group-item">
                    {m.nombre} <span className="text-muted">({m.curso})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted">Sin materias asignadas</div>
            )}
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title="Mis Cursos Asignados">
            <ul className="list-group list-group-flush">
              {cursos.map((c, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{c.anio}° {c.division}</span>
                  <span className="badge bg-primary">{c.alumnos?.length || 0} alumnos</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </>
  );
}

//
// 🔹 PRECEPTOR
//
function DashboardPreceptor({ token, idPreceptor }) {
  const today = new Date().toISOString().slice(0,10)
  const { data, loading, refresh } = useCachedFetch(`preceptorDashboard-${idPreceptor}`, async () => {
    const cursos = await listarCursosPorPreceptor(token, idPreceptor)
    const alumnosTotales = cursos.reduce((acc,c)=>acc+(c.alumnos?.length||0),0)
    
    // Asistencia hoy por curso (best effort; si falla alguna se ignora)
    const asistenciaPorCurso = await Promise.all(cursos.map(c => listarAsistenciaCursoPorFecha(token, c.id, today).catch(()=>[])))
    const flat = asistenciaPorCurso.flat()
    const presentes = flat.filter(a => a.estado === 'PRESENTE').length
    const ausentes = flat.filter(a => a.estado === 'AUSENTE').length
    const tardes = flat.filter(a => a.estado === 'TARDE').length
    
    // Distribución por curso
    const alumnosPorCurso = cursos
      .map(c => ({ name: `${c.anio}° ${c.division}`, value: c.alumnos?.length || 0 }))
      .filter(x => x.value > 0)
    
    // Asistencia hoy
    const asistenciaHoy = [
      { name: 'Presentes', value: presentes },
      { name: 'Ausentes', value: ausentes },
      { name: 'Tarde', value: tardes },
    ].filter(x => x.value > 0)
    
    return { cursos, alumnosTotales, presentes, ausentes, tardes, alumnosPorCurso, asistenciaHoy }
  }, 4*60_000)

  if (loading || !data) return <LoadingSkeleton blocks={3} />;
  const { cursos, alumnosTotales, presentes, ausentes, tardes, alumnosPorCurso, asistenciaHoy } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Cursos a cargo" value={cursos.length} /></div>
        <div className="col-md-3"><KpiCard title="Alumnos totales" value={alumnosTotales} color="#6f42c1" /></div>
        <div className="col-md-3"><KpiCard title="Presentes hoy" value={presentes} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Ausentes/Tarde" value={ausentes + tardes} color="#dc3545" /></div>
      </div>
      <div className="row g-4">
        <div className="col-md-6">
          <ChartCard title="Distribución de alumnos por curso" right={<RefreshButton onClick={refresh} />}>
            {alumnosPorCurso.length > 0 ? (
              <SimpleBar data={alumnosPorCurso} />
            ) : (
              <div className="text-muted">Sin datos</div>
            )}
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title="Asistencia hoy">
            {asistenciaHoy.length > 0 ? (
              <SimplePie data={asistenciaHoy} />
            ) : (
              <div className="text-muted">Sin registros</div>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}

// AUXILIAR: foco en reservas, aulas (placeholder sin datos reales aún)
function DashboardAuxiliar({ token }) {
  const today = new Date().toISOString().slice(0,10)
  const { data, loading, refresh } = useCachedFetch('auxiliarDashboard', async () => {
    const rs = await listarReservas(token).catch(()=>null)
    const lista = rs ? (Array.isArray(rs?.reservas) ? rs.reservas : Array.isArray(rs?.items) ? rs.items : Array.isArray(rs) ? rs : []) : []
    const hoy = lista.filter(r => (r.fecha || r.dia || '').startsWith(today))
    const pendientes = lista.filter(r => (r.estado || r.status || '').toUpperCase()==='PENDIENTE').length
    const aprobadas = lista.filter(r => (r.estado || r.status || '').toUpperCase()==='APROBADA').length
    
    // Estado de reservas
    const estadoReservas = [
      { name: 'Pendientes', value: pendientes },
      { name: 'Aprobadas', value: aprobadas },
      { name: 'Otras', value: Math.max(lista.length - pendientes - aprobadas, 0) }
    ].filter(x => x.value > 0)
    
    return { ocupadas: aprobadas, hoyCount: hoy.length, pendientes, totalReservas: lista.length, estadoReservas, reservas: hoy.slice(0,5) }
  }, 2*60_000)
  
  if (loading || !data) return <LoadingSkeleton blocks={3} />
  const { ocupadas, hoyCount, pendientes, totalReservas, estadoReservas, reservas } = data
  
  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Reservas hoy" value={hoyCount} /></div>
        <div className="col-md-3"><KpiCard title="Aprobadas" value={ocupadas} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Pendientes" value={pendientes} color="#dc3545" /></div>
        <div className="col-md-3"><KpiCard title="Total reservas" value={totalReservas} color="#6f42c1" /></div>
      </div>
      <div className="row g-4">
        <div className="col-md-6">
          <ChartCard title="Estado de reservas" right={<RefreshButton onClick={refresh} />}>
            {estadoReservas.length > 0 ? (
              <SimplePie data={estadoReservas} />
            ) : (
              <div className="text-muted">Sin datos</div>
            )}
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title="Reservas de hoy">
            {reservas.length === 0 && <div className="text-muted">Sin reservas</div>}
            <ul className="list-group list-group-flush">
              {reservas.map((r,i) => (
                <li key={i} className="list-group-item" style={{fontSize:'0.8rem'}}>
                  {(r.aulaNombre || r.espacio || 'Aula')} - {(r.docenteNombre || r.usuarioNombre || 'Usuario')}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </>
  )
}

//
// 🔹 COMPONENTES REUTILIZABLES
//
function WelcomeHeader({ user }) {
  const nombre = (user?.nombre || user?.name || user?.username || 'Usuario')
  const firstName = String(nombre).trim().split(' ')[0] || 'Usuario'
  const roleMap = {
    'ROLE_ADMIN': 'Administrador',
    'ROLE_DIRECTOR': 'Director',
    'ROLE_DOCENTE': 'Docente',
    'ROLE_PRECEPTOR': 'Preceptor',
    'ROLE_AUXILIAR': 'Auxiliar',
  }
  const rolLabel = roleMap[user?.rol] || 'Usuario'

  return (
    <div className="mb-4 p-3 rounded-3 border bg-white shadow-sm">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h3 className="mb-1">Hola, {firstName}</h3>
          <div className="text-muted" style={{maxWidth:'840px'}}>
            Tu panel con información clave según tu rol.
          </div>
        </div>
        <span className="badge text-bg-primary" style={{fontSize:'0.9rem'}}>{rolLabel}</span>
      </div>
    </div>
  )
}

// Helper para formatear fechas a DD/MM/YYYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
