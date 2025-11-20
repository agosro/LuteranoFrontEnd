import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Accordion, Badge } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import AsyncAlumnoSelect from '../Components/Controls/AsyncAlumnoSelect';
import { useAuth } from '../Context/AuthContext';
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from '../Services/CursoService';
import { obtenerInasistenciasPorCurso, obtenerInasistenciasPorAlumno } from '../Services/ReporteInasistenciasDetalleService';
import { toast } from 'react-toastify';

export default function ReporteInasistenciasDetalle() {
  const { user } = useAuth();
  const token = user?.token;

  const [modo, setModo] = useState('curso'); // 'curso' | 'alumno'
  const [cursos, setCursos] = useState([]);
  const [cursoAnioSel, setCursoAnioSel] = useState('');
  const [divisionSel, setDivisionSel] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [alumnoId, setAlumnoId] = useState('');
  const [alumnoOption, setAlumnoOption] = useState(null);
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const printRef = useRef(null);
  
  // Para modo alumno: filtros de curso para cargar alumnos
  const [alumnoModoAnio, setAlumnoModoAnio] = useState('');
  const [alumnoModoDivision, setAlumnoModoDivision] = useState('');

  // Cargar cursos según rol
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        let lista = [];
        if (user?.rol === 'ROLE_DOCENTE' && user?.docenteId) {
          lista = await listarCursosPorDocente(token, user.docenteId);
        } else if (user?.rol === 'ROLE_PRECEPTOR' && user?.preceptorId) {
          lista = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          lista = await listarCursos(token);
        }
        setCursos(lista || []);
      } catch (e) {
        console.warn('No se pudieron cargar cursos:', e);
      }
    })();
  }, [token, user]);

  const aniosPosibles = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map(String);
  }, []);

  // Opciones de año y división
  const aniosCursoOptions = useMemo(() => {
    const set = new Set();
    (cursos || []).forEach(c => { if (c.anio != null) set.add(String(c.anio)); });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [cursos]);

  const divisionesOptions = useMemo(() => {
    if (modo === 'curso' && !cursoAnioSel) return [];
    if (modo === 'alumno' && !alumnoModoAnio) return [];
    
    const anioFiltro = modo === 'curso' ? cursoAnioSel : alumnoModoAnio;
    const set = new Set();
    (cursos || []).filter(c => String(c.anio) === String(anioFiltro)).forEach(c => {
      if (c.division != null && c.division !== '') set.add(String(c.division));
    });
    return Array.from(set).sort();
  }, [cursos, cursoAnioSel, alumnoModoAnio, modo]);

  // Mapear cursoId
  useEffect(() => {
    const match = (cursos || []).find(c => String(c.anio) === String(cursoAnioSel) && String(c.division) === String(divisionSel));
    setCursoId(match?.id ? String(match.id) : '');
  }, [cursos, cursoAnioSel, divisionSel]);

  // Reset alumno cuando cambia modo
  useEffect(() => {
    if (modo === 'curso') {
      setAlumnoId('');
      setAlumnoOption(null);
      setAlumnoModoAnio('');
      setAlumnoModoDivision('');
    } else {
      setCursoAnioSel('');
      setDivisionSel('');
      setCursoId('');
    }
  }, [modo]);

  const fetchReporte = async () => {
    try {
      setCargando(true);
      setData(null);
      let res;
      if (modo === 'curso') {
        if (!cursoId) {
          toast.error('Debe seleccionar un curso');
          return;
        }
        res = await obtenerInasistenciasPorCurso(token, cursoId, Number(anio));
      } else {
        if (!alumnoId) {
          toast.error('Debe seleccionar un alumno');
          return;
        }
        res = await obtenerInasistenciasPorAlumno(token, alumnoId, Number(anio));
      }
      // La respuesta tiene la estructura { filas: [...], code, mensaje }
      setData(res?.filas || []);
      if (res?.code && res.code < 0) toast.error(res?.mensaje || 'Error en el reporte');
    } catch (e) {
      toast.error(e?.mensaje || e?.message || 'Error al obtener reporte');
      setData(null);
    } finally {
      setCargando(false);
    }
  };

  // Computar datos para gráficos y KPIs
  const kpisData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const alumnos = data;
    const totalAlumnos = alumnos.length;
    const totalInasistenciasJustificadas = alumnos.reduce((acc, a) => acc + (a?.totalJustificadas || 0), 0);
    const totalInasistenciasNoJustificadas = alumnos.reduce((acc, a) => acc + (a?.totalNoJustificadas || 0), 0);
    const totalInasistencias = totalInasistenciasJustificadas + totalInasistenciasNoJustificadas;
    const promedioInasist = totalAlumnos > 0 ? Math.round((totalInasistencias / totalAlumnos) * 10) / 10 : 0;

    // Distribución por rangos
    const distribucion = [
      { rango: '0-5', count: 0, color: '#28a745' },
      { rango: '6-10', count: 0, color: '#20c997' },
      { rango: '11-15', count: 0, color: '#ffc107' },
      { rango: '16-20', count: 0, color: '#fd7e14' },
      { rango: '21+', count: 0, color: '#dc3545' }
    ];

    alumnos.forEach(a => {
      const total = (a?.totalJustificadas || 0) + (a?.totalNoJustificadas || 0);
      if (total >= 0 && total <= 5) distribucion[0].count++;
      else if (total >= 6 && total <= 10) distribucion[1].count++;
      else if (total >= 11 && total <= 15) distribucion[2].count++;
      else if (total >= 16 && total <= 20) distribucion[3].count++;
      else if (total >= 21) distribucion[4].count++;
    });

    // Tipo de inasistencias
    const tipoData = [
      { name: 'Justificadas', value: totalInasistenciasJustificadas, color: '#17a2b8' },
      { name: 'No Justificadas', value: totalInasistenciasNoJustificadas, color: '#dc3545' }
    ];

    // Top 5 alumnos con más inasistencias
    const top5 = [...alumnos]
      .map(a => ({
        nombre: `${(a?.apellido || '').trim().substring(0, 15)} ${(a?.nombre || '').trim().substring(0, 1)}.`.trim(),
        total: (a?.totalJustificadas || 0) + (a?.totalNoJustificadas || 0),
        justificadas: a?.totalJustificadas || 0,
        noJustificadas: a?.totalNoJustificadas || 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalAlumnos,
      totalInasistencias,
      totalInasistenciasJustificadas,
      totalInasistenciasNoJustificadas,
      promedioInasist,
      distribucion,
      tipoData,
      top5
    };
  }, [data]);

  const exportCSV = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    
    const header = ["Alumno", "DNI", "Justificadas", "No Justificadas", "Total"];
    const rows = data.map(a => {
      const alumno = `${(a?.apellido || '').trim()} ${(a?.nombre || '').trim()}`.trim();
      const j = a?.totalJustificadas || 0;
      const nj = a?.totalNoJustificadas || 0;
      const total = j + nj;
      return [alumno, a?.dni || '', j, nj, total];
    });

    // Agregar detalle por fecha si existe
    const detalleRows = [];
    if (data[0]?.detalles && data[0].detalles.length > 0) {
      detalleRows.push(['', '', '', '', '']);
      detalleRows.push(['Detalle por Fecha']);
      data.forEach(a => {
        const alumno = `${(a?.apellido || '').trim()} ${(a?.nombre || '').trim()}`.trim();
        detalleRows.push([alumno]);
        detalleRows.push(['Fecha', 'Estado', 'Observación']);
        (a?.detalles || []).forEach(d => {
          detalleRows.push([d?.fecha || '', d?.estado || '', d?.observacion || '']);
        });
      });
    }

    const csv = [header, ...rows, ...detalleRows]
      .map(cols => cols.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = modo === 'curso' 
      ? `reporte_inasistencias_curso_${cursoAnioSel}_${divisionSel}_${anio}.csv`
      : `reporte_inasistencias_alumno_${alumnoId}_${anio}.csv`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printOnlyTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 20px; 
        color: #212529;
      }
      h3 { 
        margin: 0 0 8px 0; 
        font-size: 20px;
        font-weight: 600;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        padding-bottom: 6px;
      }
      .sub { 
        margin: 0 0 16px 0; 
        color: #6c757d; 
        font-size: 12px; 
      }
      .kpi-section {
        background: #f8f9fa;
        padding: 14px;
        border-radius: 6px;
        margin-bottom: 16px;
        border: 1px solid #dee2e6;
      }
      .kpi-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #495057;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .kpi-card {
        background: white;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        text-align: center;
      }
      .kpi-label {
        font-size: 10px;
        color: #6c757d;
        margin-bottom: 3px;
      }
      .kpi-value {
        font-size: 16px;
        font-weight: 600;
        color: #212529;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 11px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 6px 8px; 
      }
      thead tr:first-child th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }
      .badge-info { background: #17a2b8; color: white; }
      .badge-danger { background: #dc3545; color: white; }
      .badge-dark { background: #343a40; color: white; }
      @media print {
        body { padding: 12px; }
        .kpi-section { page-break-inside: avoid; }
      }
    `;
    const titulo = modo === 'curso' 
      ? `Reporte de Inasistencias · Curso ${cursoAnioSel}°${divisionSel}` 
      : `Reporte de Inasistencias · Alumno ${alumnoOption?.label || ''}`;
    const sub = `Año: ${anio}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Inasistencias</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(`<div class="sub">${sub}</div>`);
    
    // KPIs
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Resumen Estadístico</div>`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Inasistencias</div><div class="kpi-value">${kpisData.totalInasistencias}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Justificadas</div><div class="kpi-value" style="color:#17a2b8">${kpisData.totalInasistenciasJustificadas}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">No Justificadas</div><div class="kpi-value" style="color:#dc3545">${kpisData.totalInasistenciasNoJustificadas}</div></div>`);
      win.document.write(`</div>`);
      win.document.write(`</div>`);
    }
    
    // Tabla sin detalle
    win.document.write(`<table>`);
    win.document.write(`<thead><tr><th>Alumno</th><th>DNI</th><th style="text-align:right">Justificadas</th><th style="text-align:right">No Justificadas</th><th style="text-align:right">Total</th></tr></thead>`);
    win.document.write(`<tbody>`);
    data.forEach(alumno => {
      const nombreCompleto = `${(alumno?.apellido || '').trim()} ${(alumno?.nombre || '').trim()}`.trim() || '-';
      const j = alumno?.totalJustificadas || 0;
      const nj = alumno?.totalNoJustificadas || 0;
      const total = j + nj;
      win.document.write(`<tr>`);
      win.document.write(`<td>${nombreCompleto}</td>`);
      win.document.write(`<td>${alumno?.dni || ''}</td>`);
      win.document.write(`<td style="text-align:right"><span class="badge badge-info">${j}</span></td>`);
      win.document.write(`<td style="text-align:right"><span class="badge badge-danger">${nj}</span></td>`);
      win.document.write(`<td style="text-align:right"><span class="badge badge-dark">${total}</span></td>`);
      win.document.write(`</tr>`);
    });
    win.document.write(`</tbody></table>`);
    
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const printWithDetail = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 20px; 
        color: #212529;
      }
      h3 { 
        margin: 0 0 8px 0; 
        font-size: 20px;
        font-weight: 600;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        padding-bottom: 6px;
      }
      .sub { 
        margin: 0 0 16px 0; 
        color: #6c757d; 
        font-size: 12px; 
      }
      .kpi-section {
        background: #f8f9fa;
        padding: 14px;
        border-radius: 6px;
        margin-bottom: 16px;
        border: 1px solid #dee2e6;
      }
      .kpi-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #495057;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .kpi-card {
        background: white;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        text-align: center;
      }
      .kpi-label {
        font-size: 10px;
        color: #6c757d;
        margin-bottom: 3px;
      }
      .kpi-value {
        font-size: 16px;
        font-weight: 600;
        color: #212529;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 10px;
        margin-bottom: 20px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 5px 6px; 
      }
      thead tr:first-child th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      .alumno-section {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      .alumno-header {
        background: #e9ecef;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-weight: 600;
      }
      .badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 9px;
        font-weight: 600;
      }
      .badge-info { background: #17a2b8; color: white; }
      .badge-danger { background: #dc3545; color: white; }
      .badge-dark { background: #343a40; color: white; }
      .badge-success { background: #28a745; color: white; }
      @media print {
        body { padding: 12px; }
        .kpi-section, .alumno-section { page-break-inside: avoid; }
      }
    `;
    const titulo = modo === 'curso' 
      ? `Reporte de Inasistencias con Detalle · Curso ${cursoAnioSel}°${divisionSel}` 
      : `Reporte de Inasistencias con Detalle · Alumno ${alumnoOption?.label || ''}`;
    const sub = `Año: ${anio}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Inasistencias - Detallado</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(`<div class="sub">${sub}</div>`);
    
    // KPIs
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Resumen Estadístico</div>`);
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Alumnos</div><div class="kpi-value">${kpisData.totalAlumnos}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Total Inasistencias</div><div class="kpi-value">${kpisData.totalInasistencias}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Justificadas</div><div class="kpi-value" style="color:#17a2b8">${kpisData.totalInasistenciasJustificadas}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">No Justificadas</div><div class="kpi-value" style="color:#dc3545">${kpisData.totalInasistenciasNoJustificadas}</div></div>`);
      win.document.write(`</div>`);
      win.document.write(`</div>`);
    }
    
    // Tabla con detalle para cada alumno
    data.forEach(alumno => {
      const nombreCompleto = `${(alumno?.apellido || '').trim()} ${(alumno?.nombre || '').trim()}`.trim() || '-';
      const j = alumno?.totalJustificadas || 0;
      const nj = alumno?.totalNoJustificadas || 0;
      const total = j + nj;
      const detalle = alumno?.detalles || [];
      
      win.document.write(`<div class="alumno-section">`);
      win.document.write(`<div class="alumno-header">${nombreCompleto} (DNI: ${alumno?.dni || ''}) - Justificadas: ${j} | No Justificadas: ${nj} | Total: ${total}</div>`);
      
      if (detalle.length > 0) {
        win.document.write(`<table>`);
        win.document.write(`<thead><tr><th>Fecha</th><th>Estado</th><th>Observación</th></tr></thead>`);
        win.document.write(`<tbody>`);
        detalle.forEach(dia => {
          const bgColor = dia?.estado === 'AUSENTE' ? 'badge-danger' : 'badge-success';
          win.document.write(`<tr>`);
          win.document.write(`<td>${dia?.fecha || '-'}</td>`);
          win.document.write(`<td><span class="badge ${bgColor}">${dia?.estado || '-'}</span></td>`);
          win.document.write(`<td>${dia?.observacion || '-'}</td>`);
          win.document.write(`</tr>`);
        });
        win.document.write(`</tbody></table>`);
      } else {
        win.document.write(`<p style="font-style:italic;color:#6c757d">Sin detalle de inasistencias</p>`);
      }
      
      win.document.write(`</div>`);
    });
    
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container py-3">
      <Breadcrumbs />
      <div className="mb-2"><BackButton /></div>
      <div className="d-flex align-items-center justify-content-center mb-3">
        <h2 className="m-0 text-center">Reporte Detallado de Inasistencias</h2>
      </div>
      <p className="text-muted mb-3 text-center">
        Este reporte muestra el total de inasistencias justificadas y no justificadas, junto con el detalle día por día.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-3">
              <label className="form-label">Modo</label>
              <select className="form-select" value={modo} onChange={(e) => setModo(e.target.value)}>
                <option value="curso">Por curso</option>
                <option value="alumno">Por alumno</option>
              </select>
            </div>

            {modo === 'curso' && (
              <>
                <div className="col-sm-2">
                  <label className="form-label">Año del curso</label>
                  <select className="form-select" value={cursoAnioSel} onChange={(e) => { setCursoAnioSel(e.target.value); setDivisionSel(''); }}>
                    <option value="">Seleccione</option>
                    {aniosCursoOptions.map(y => <option key={y} value={y}>{y}°</option>)}
                  </select>
                </div>
                <div className="col-sm-2">
                  <label className="form-label">División</label>
                  <select className="form-select" value={divisionSel} onChange={(e) => setDivisionSel(e.target.value)} disabled={!cursoAnioSel}>
                    <option value="">Seleccione</option>
                    {divisionesOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}

            {modo === 'alumno' && (
              <>
                <div className="col-sm-2">
                  <label className="form-label">Año del curso</label>
                  <select className="form-select" value={alumnoModoAnio} onChange={(e) => { setAlumnoModoAnio(e.target.value); setAlumnoModoDivision(''); setAlumnoId(''); setAlumnoOption(null); }}>
                    <option value="">Todos</option>
                    {aniosCursoOptions.map(y => <option key={y} value={y}>{y}°</option>)}
                  </select>
                </div>
                <div className="col-sm-2">
                  <label className="form-label">División</label>
                  <select className="form-select" value={alumnoModoDivision} onChange={(e) => { setAlumnoModoDivision(e.target.value); setAlumnoId(''); setAlumnoOption(null); }}>
                    <option value="">Todas</option>
                    {alumnoModoAnio && divisionesOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-sm-4">
                  <label className="form-label">Alumno (buscar por DNI, nombre o apellido)</label>
                  <AsyncAlumnoSelect
                    token={token}
                    value={alumnoOption}
                    onChange={(opt) => { setAlumnoOption(opt); setAlumnoId(opt?.value || ''); }}
                    cursoAnio={alumnoModoAnio || null}
                    cursoDivision={alumnoModoDivision || null}
                    placeholder="Escriba DNI, nombre o apellido..."
                  />
                </div>
              </>
            )}

            <div className="col-sm-2">
              <label className="form-label">Año calendario</label>
              <select className="form-select" value={anio} onChange={(e) => setAnio(e.target.value)}>
                {aniosPosibles.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="col-sm-12 d-flex justify-content-end gap-2">
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => {
                  setCursoAnioSel('');
                  setDivisionSel('');
                  setCursoId('');
                  setAlumnoModoAnio('');
                  setAlumnoModoDivision('');
                  setAlumnoId('');
                  setAlumnoOption(null);
                  setData(null);
                }}
              >
                Limpiar Filtros
              </button>
              <button 
                className="btn btn-primary" 
                onClick={fetchReporte} 
                disabled={cargando || (modo === 'curso' && !cursoId) || (modo === 'alumno' && !alumnoId)}
              >
                {cargando ? <><span className="spinner-border spinner-border-sm me-2" />Buscando...</> : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {data && kpisData && (
        <>
          <div className="row g-2 mb-2">
            <div className="col-auto"><Badge bg="secondary">Total alumnos: {kpisData.totalAlumnos}</Badge></div>
            <div className="col-auto"><Badge bg="info">Total inasistencias: {kpisData.totalInasistencias}</Badge></div>
            <div className="col-auto"><Badge bg="primary" className="text-white">Justificadas: {kpisData.totalInasistenciasJustificadas}</Badge></div>
            <div className="col-auto"><Badge bg="danger">No justificadas: {kpisData.totalInasistenciasNoJustificadas}</Badge></div>
            <div className="col-auto"><Badge bg="warning" className="text-dark">Promedio: {kpisData.promedioInasist}</Badge></div>
          </div>

          {/* KPIs y Gráficos desplegables */}
          <Accordion className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <BarChart3 size={18} className="me-2" />
                <strong>Análisis Detallado y Gráficos</strong>
              </Accordion.Header>
              <Accordion.Body>
                {/* KPIs en Cards */}
                <Row className="g-3 mb-4">
                  <Col md={3}>
                    <Card className="h-100 border-secondary">
                      <Card.Body className="text-center">
                        <div className="text-muted small mb-1">Total Alumnos</div>
                        <div className="h2 mb-0 text-secondary">{kpisData.totalAlumnos}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 border-info">
                      <Card.Body className="text-center">
                        <div className="text-muted small mb-1">Total Inasistencias</div>
                        <div className="h2 mb-0 text-info">{kpisData.totalInasistencias}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 border-primary">
                      <Card.Body className="text-center">
                        <div className="text-muted small mb-1">Justificadas</div>
                        <div className="h2 mb-0 text-primary">{kpisData.totalInasistenciasJustificadas}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 border-danger">
                      <Card.Body className="text-center">
                        <div className="text-muted small mb-1">No Justificadas</div>
                        <div className="h2 mb-0 text-danger">{kpisData.totalInasistenciasNoJustificadas}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Gráficos */}
                <Row className="g-3">
                  <Col md={7}>
                    <Card>
                      <Card.Body>
                        <h6 className="mb-3">Distribución de Inasistencias por Rango</h6>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={kpisData.distribucion}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="rango" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Cantidad de alumnos" fill="#0066cc">
                              {kpisData.distribucion.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={5}>
                    <Card>
                      <Card.Body>
                        <h6 className="mb-3">Justificadas vs No Justificadas</h6>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={kpisData.tipoData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {kpisData.tipoData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Top 5 */}
                {kpisData.top5.length > 0 && (
                  <Row className="g-3 mt-2">
                    <Col md={12}>
                      <Card>
                        <Card.Body>
                          <h6 className="mb-3">Top 5 Alumnos con Más Inasistencias</h6>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={kpisData.top5} layout="horizontal">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="nombre" type="category" width={150} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="justificadas" stackId="a" fill="#17a2b8" name="Justificadas" />
                              <Bar dataKey="noJustificadas" stackId="a" fill="#dc3545" name="No Justificadas" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <div className="d-flex justify-content-end gap-2 mb-3">
            <button className="btn btn-outline-secondary btn-sm" onClick={exportCSV}>Exportar CSV</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={printOnlyTable}>Imprimir / PDF (Resumen)</button>
            <button className="btn btn-outline-primary btn-sm" onClick={printWithDetail}>Imprimir / PDF (Con Detalle)</button>
          </div>

          <div className="card">
            <div className="card-header"><strong>Resultados</strong></div>
            <div className="card-body p-0" ref={printRef}>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Alumno</th>
                      <th>DNI</th>
                      <th className="text-end">Justificadas</th>
                      <th className="text-end">No Justificadas</th>
                      <th className="text-end">Total</th>
                      <th className="text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || !Array.isArray(data) || data.length === 0) && (
                      <tr><td colSpan={6} className="text-center text-muted py-3">Sin datos</td></tr>
                    )}
                    {Array.isArray(data) && data.map((alumno, idx) => {
                      const nombreCompleto = `${(alumno?.apellido || '').trim()} ${(alumno?.nombre || '').trim()}`.trim() || '-';
                      const j = alumno?.totalJustificadas || 0;
                      const nj = alumno?.totalNoJustificadas || 0;
                      const total = j + nj;
                      const detalle = alumno?.detalles || [];

                      return (
                        <React.Fragment key={idx}>
                          <tr>
                            <td>{nombreCompleto}</td>
                            <td>{alumno?.dni || ''}</td>
                            <td className="text-end"><Badge bg="info">{j}</Badge></td>
                            <td className="text-end"><Badge bg="danger">{nj}</Badge></td>
                            <td className="text-end"><Badge bg="dark">{total}</Badge></td>
                            <td className="text-center">
                              {detalle.length > 0 && (
                                <button 
                                  className="btn btn-sm btn-outline-secondary"
                                  type="button"
                                  data-bs-toggle="collapse"
                                  data-bs-target={`#detalle-${idx}`}
                                >
                                  <Calendar size={14} className="me-1" />
                                  Ver detalle ({detalle.length})
                                </button>
                              )}
                            </td>
                          </tr>
                          {detalle.length > 0 && (
                            <tr className="collapse" id={`detalle-${idx}`}>
                              <td colSpan={6} className="bg-light">
                                <div className="p-3">
                                  <h6 className="mb-2">Detalle por fecha - {nombreCompleto}</h6>
                                  <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0">
                                      <thead>
                                        <tr>
                                          <th>Fecha</th>
                                          <th>Estado</th>
                                          <th>Observación</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detalle.map((dia, diaIdx) => (
                                          <tr key={diaIdx}>
                                            <td>{dia?.fecha || '-'}</td>
                                            <td>
                                              <Badge bg={dia?.estado === 'AUSENTE' ? 'danger' : 'success'}>
                                                {dia?.estado || '-'}
                                              </Badge>
                                            </td>
                                            <td>{dia?.observacion || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !cargando && (
        <div className="alert alert-info text-center">
          Seleccione los filtros y presione "Buscar" para generar el reporte
        </div>
      )}
    </div>
  );
}
