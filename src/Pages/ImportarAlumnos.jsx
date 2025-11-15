import { useState, useRef } from "react";
import { useAuth } from "../Context/AuthContext";
import { importarAlumnos } from "../Services/ImportService";
import { Container, Card, Button, Form, Spinner, Alert, Table, Badge, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import { normalizeCsvHeaders } from "../utils/csvHeaders";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import { useNavigate } from "react-router-dom";

export default function ImportarAlumnos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [headerPreview, setHeaderPreview] = useState("");
  const [normalized, setNormalized] = useState(false);
  const fileInputRef = useRef(null);

  const BACKEND_HEADERS = [
    "Grado/Año",
    "División",
    "Plan de Estu.",
    "Nro. Docum.",
    "Apellido",
    "Nombre",
    "Fecha Nacimiento"
  ];

  // Mapa de alias -> encabezado backend
  const HEADER_ALIASES = {
    "grado/ano": "Grado/Año",
    "grado/año": "Grado/Año",
    "grado": "Grado/Año",
    "division": "División",
    "división": "División",
    "plan de estu": "Plan de Estu.",
    "plan de estu.": "Plan de Estu.",
    "nro docum": "Nro. Docum.",
    "nro docum.": "Nro. Docum.",
    "nro documento": "Nro. Docum.",
    "apellido": "Apellido",
    "nombre": "Nombre",
    "fecha nacimiento": "Fecha Nacimiento",
    "fecha de nacimiento": "Fecha Nacimiento"
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setResult(null);
    setHeaderPreview("");
    setNormalized(false);
    if (!f) return;

    normalizeCsvHeaders(f, HEADER_ALIASES)
      .then(({ file: newFile, headerPreview, normalized }) => {
        if (normalized) toast.info("Se normalizaron los encabezados para coincidir con el backend");
        setFile(newFile);
        setHeaderPreview(headerPreview);
        setNormalized(normalized);
      })
      .catch((err) => {
        console.warn("No se pudo normalizar encabezados", err);
        // Fallback: leer primer línea simple
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result || "";
          const firstLine = (String(text).split(/\r?\n/)[0] || "").trim();
          setHeaderPreview(firstLine);
        };
        reader.readAsText(f, "UTF-8");
      });
  };

  const handleImport = async () => {
    if (!file) {
      toast.warning("Seleccioná un archivo CSV antes de continuar");
      return;
    }
    setLoading(true);
    try {
      const data = await importarAlumnos(file, dryRun, user.token);
      setResult(data);
      toast.success(
        dryRun
          ? "Prueba completada correctamente (dry run)"
          : "Importación finalizada correctamente"
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Ocurrió un error al importar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = BACKEND_HEADERS.join(";");
    const sample = [
      headers,
      "PRIMER AÑO;A;CICLO BASICO;40111222;García;Lucía;12/03/2011"
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=UTF-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_alumnos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFile = () => {
    setFile(null);
    setResult(null);
    setHeaderPreview("");
    setNormalized(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Container className="mt-4">
      {/* Migas de pan y botón volver debajo */}
      <div className="mb-3">
        <Breadcrumbs />
        <Button variant="outline-secondary" className="mt-2" onClick={() => navigate(-1)}>← Volver</Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Importar Alumnos desde CSV</h3>
           <p className="text-muted mb-4">
             Subí un archivo CSV para cargar o actualizar alumnos en el sistema. Usá la plantilla para evitar errores de formato.
           </p>

          <Row className="align-items-end g-3 mb-2">
            <Col md={7} lg={6}>
              <Form.Group controlId="fileCsv">
                <Form.Label>Archivo CSV (UTF-8)</Form.Label>
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </Form.Group>
              {headerPreview && (
                <div style={{fontSize: '0.7rem'}} className="text-muted mt-1">
                  <strong>Encabezados detectados:</strong> <code style={{whiteSpace:'break-spaces'}}>{headerPreview}</code>
                </div>
              )}
            </Col>
            <Col md={5} lg={6} className="d-flex gap-2 justify-content-start justify-content-md-start">
              <Button variant="secondary" onClick={handleDownloadTemplate} disabled={loading} className="flex-shrink-0">
                Descargar plantilla
              </Button>
              {file && (
                <Button variant="outline-danger" onClick={resetFile} disabled={loading} className="flex-shrink-0">
                  Quitar archivo
                </Button>
              )}
            </Col>
          </Row>

          <Form.Group className="mb-4" controlId="dryRunCheck">
            <Form.Check
              type="checkbox"
              label="Ejecutar como prueba (no guarda los datos)"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={loading}
            />
          </Form.Group>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <Button
              variant="success"
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" /> Importando...
                </>
              ) : (
                "Importar CSV"
              )}
            </Button>
            {dryRun && (
              <Badge bg="warning" text="dark">Modo prueba (no persiste)</Badge>
            )}
            {normalized && (
              <Badge bg="info" text="dark">Encabezados normalizados</Badge>
            )}
          </div>

          {result && (
            <div className="mt-4">
              <h5>📊 Resultado de la importación</h5>
              <Table bordered hover responsive size="sm" className="mt-2">
                <tbody>
                  <tr>
                    <td>Total de filas</td>
                    <td>{result.totalRows}</td>
                  </tr>
                  <tr>
                    <td>Insertados</td>
                    <td>{result.inserted}</td>
                  </tr>
                  <tr>
                    <td>Actualizados</td>
                    <td>{result.updated}</td>
                  </tr>
                  <tr>
                    <td>Reactivados</td>
                    <td>{result.reactivated}</td>
                  </tr>
                  <tr>
                    <td>Omitidos</td>
                    <td>{result.skipped}</td>
                  </tr>
                </tbody>
              </Table>

              {result.errors && result.errors.length > 0 && (
                <Alert variant="warning" className="mt-3" style={{maxHeight: 250, overflowY: 'auto'}}>
                  <strong>⚠️ Errores detectados ({result.errors.length}):</strong>
                  <ul className="mt-2 mb-0">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
