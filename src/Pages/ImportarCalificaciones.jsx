import { useRef, useState } from "react";
import { Container, Card, Button, Form, Spinner, Alert, Table, Badge, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { importarNotas } from "../Services/ImportService";
import { normalizeCsvHeaders } from "../utils/csvHeaders";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import { useNavigate } from "react-router-dom";

export default function ImportarCalificaciones() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [file, setFile] = useState(null);
	const [dryRun, setDryRun] = useState(true);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [headerPreview, setHeaderPreview] = useState("");
	const [normalized, setNormalized] = useState(false);
	const fileInputRef = useRef(null);

	// Headers que lee el backend (según ImportsController docstring)
	const BACKEND_HEADERS = [
		"Grado/Año",
		"División",
		"Turno",
		"Plan de Estu.",
		"Ciclo",
		"N° Documento",
		"Apellido",
		"Nombre",
		"Fecha Nacimiento",
		"Espacio Curricular",
		"Código Espacio Curricular",
		"Curso",
		"Nota 1 Etapa 1",
		"Nota 2 Etapa 1",
		"Nota 3 Etapa 1",
		"Nota 4 Etapa 1",
		"Nota 1 Etapa 2",
		"Nota 2 Etapa 2",
		"Nota 3 Etapa 2",
		"Nota 4 Etapa 2",
	];

	// Aliases comunes -> header esperado por backend
	const HEADER_ALIASES = {
		"grado/ano": "Grado/Año",
		"grado/año": "Grado/Año",
		"grado": "Grado/Año",
		"division": "División",
		"división": "División",
		"turno": "Turno",
		"plan de estu": "Plan de Estu.",
		"plan de estu.": "Plan de Estu.",
		"ciclo": "Ciclo",
		"nro docum": "N° Documento",
		"nro docum.": "N° Documento",
		"n° documento": "N° Documento",
		"nro documento": "N° Documento",
		"documento": "N° Documento",
		"apellido": "Apellido",
		"nombre": "Nombre",
		"fecha nacimiento": "Fecha Nacimiento",
		"fecha de nacimiento": "Fecha Nacimiento",
		"espacio curricular": "Espacio Curricular",
		"codigo espacio curricular": "Código Espacio Curricular",
		"código espacio curricular": "Código Espacio Curricular",
		"curso": "Curso",
		// notas etapa 1
		"nota 1 etapa 1": "Nota 1 Etapa 1",
		"nota1 etapa1": "Nota 1 Etapa 1",
		"n1 e1": "Nota 1 Etapa 1",
		"nota 2 etapa 1": "Nota 2 Etapa 1",
		"nota2 etapa1": "Nota 2 Etapa 1",
		"n2 e1": "Nota 2 Etapa 1",
		"nota 3 etapa 1": "Nota 3 Etapa 1",
		"nota3 etapa1": "Nota 3 Etapa 1",
		"n3 e1": "Nota 3 Etapa 1",
		"nota 4 etapa 1": "Nota 4 Etapa 1",
		"nota4 etapa1": "Nota 4 Etapa 1",
		"n4 e1": "Nota 4 Etapa 1",
		// notas etapa 2
		"nota 1 etapa 2": "Nota 1 Etapa 2",
		"nota1 etapa2": "Nota 1 Etapa 2",
		"n1 e2": "Nota 1 Etapa 2",
		"nota 2 etapa 2": "Nota 2 Etapa 2",
		"nota2 etapa2": "Nota 2 Etapa 2",
		"n2 e2": "Nota 2 Etapa 2",
		"nota 3 etapa 2": "Nota 3 Etapa 2",
		"nota3 etapa2": "Nota 3 Etapa 2",
		"n3 e2": "Nota 3 Etapa 2",
		"nota 4 etapa 2": "Nota 4 Etapa 2",
		"nota4 etapa2": "Nota 4 Etapa 2",
		"n4 e2": "Nota 4 Etapa 2",
	};


	const handleFileChange = (e) => {
		const f = e.target.files?.[0];
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
			const data = await importarNotas(file, dryRun, user.token);
			setResult(data);
			toast.success(
				dryRun ? "Prueba completada correctamente (dry run)" : "Importación de notas finalizada"
			);
		} catch (err) {
			console.error(err);
			toast.error(err.message || "Ocurrió un error al importar notas");
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadTemplate = () => {
		const headers = BACKEND_HEADERS.join(";");
		const sample = [
			headers,
			[
				"PRIMER AÑO",
				"A",
				"MAÑANA",
				"CICLO BASICO",
				"2025",
				"40111222",
				"García",
				"Lucía",
				"12/03/2011",
				"MATEMÁTICA",
				"MAT-101",
				"1A",
				"7",
				"8",
				"9",
				"-",
				"6",
				"7",
				"8",
				"-",
			].join(";")
		].join("\n");
		const blob = new Blob([sample], { type: "text/csv;charset=UTF-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "plantilla_notas.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	const resetFile = () => {
		setFile(null);
		setResult(null);
		setHeaderPreview("");
		setNormalized(false);
		if (fileInputRef.current) fileInputRef.current.value = "";
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
					<h3 className="mb-4">Importar Calificaciones (CSV)</h3>
					<p className="text-muted mb-4">
						Subí un archivo CSV para importar o actualizar calificaciones de los alumnos. Usá la plantilla para el formato correcto.
					</p>

					<Row className="align-items-end g-3 mb-2">
						<Col md={7} lg={6}>
							<Form.Group controlId="fileCsvNotas">
								<Form.Label>Archivo CSV</Form.Label>
								<Form.Control
									ref={fileInputRef}
									type="file"
									accept=".csv"
									onChange={handleFileChange}
									disabled={loading}
								/>
							</Form.Group>
							{headerPreview && (
								<div style={{ fontSize: "0.7rem" }} className="text-muted mt-1">
									<strong>Encabezados detectados:</strong>{" "}
									<code style={{ whiteSpace: "break-spaces" }}>{headerPreview}</code>
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

					<Row className="g-3 mb-3">
						<Col className="d-flex align-items-end">
							<Form.Check
								type="checkbox"
								id="dryRunCheckNotas"
								label="Ejecutar como prueba (no guarda los datos)"
								checked={dryRun}
								onChange={(e) => setDryRun(e.target.checked)}
								disabled={loading}
							/>
						</Col>
					</Row>

					<div className="d-flex align-items-center gap-3 flex-wrap">
						<Button variant="success" onClick={handleImport} disabled={!file || loading}>
							{loading ? (
								<>
									<Spinner animation="border" size="sm" /> Importando...
								</>
							) : (
								"Importar CSV"
							)}
						</Button>
						{dryRun && <Badge bg="warning" text="dark">Modo prueba (no persiste)</Badge>}
						{normalized && <Badge bg="info" text="dark">Encabezados normalizados</Badge>}
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
								<Alert variant="warning" className="mt-3" style={{ maxHeight: 250, overflowY: "auto" }}>
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
