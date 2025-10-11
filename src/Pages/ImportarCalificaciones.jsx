import { useRef, useState } from "react";
import { Container, Card, Button, Form, Spinner, Alert, Table, Badge, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import { useAuth } from "../Context/AuthContext";
import { importarNotasCidi } from "../Services/ImportService";

export default function ImportarCalificaciones() {
	const { user } = useAuth();
	const [file, setFile] = useState(null);
	const [dryRun, setDryRun] = useState(true);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [headerPreview, setHeaderPreview] = useState("");
	const [normalized, setNormalized] = useState(false);
	const [charset, setCharset] = useState("utf-8");
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

	const normalizeKey = (h) => h
		.replace("\uFEFF", "")
		.normalize("NFD").replace(/\p{M}+/gu, "")
		.toLowerCase()
		.replace(/[.]/g, "")
		.replace(/\s+/g, " ")
		.trim();

	const handleFileChange = (e) => {
		const f = e.target.files?.[0];
		setFile(f || null);
		setResult(null);
		setHeaderPreview("");
		setNormalized(false);
		if (!f) return;

		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target.result || "";
			const firstLine = (text.split(/\r?\n/)[0] || "").trim();
			setHeaderPreview(firstLine);

			const delimiter = firstLine.includes(";") ? ";" : ",";
			const cols = firstLine.split(delimiter).map((c) => c.trim());
			const replaced = cols.map((col) => {
				const key = normalizeKey(col);
				return HEADER_ALIASES[key] || col;
			});

			if (JSON.stringify(cols) !== JSON.stringify(replaced)) {
				setNormalized(true);
				toast.info("Se normalizaron los encabezados para coincidir con el backend");
				const rest = text.split(/\r?\n/).slice(1).join("\n");
				const newContent = replaced.join(delimiter) + "\n" + rest;
				const newFile = new File([newContent], f.name, { type: f.type || "text/csv" });
				setFile(newFile);
				setHeaderPreview(replaced.join(delimiter));
			}
		};
		reader.readAsText(f, charset || "UTF-8");
	};

	const handleImport = async () => {
		if (!file) {
			toast.warning("Seleccioná un archivo CSV antes de continuar");
			return;
		}
		setLoading(true);
		try {
			const data = await importarNotasCidi(user.token, file, { dryRun, charset });
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
			<Card className="shadow-sm">
				<Card.Body>
					<h3 className="mb-4">📝 Importar Calificaciones (CSV)</h3>

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
						<Col sm={6} md={4} lg={3}>
							<Form.Group controlId="charsetSelect">
								<Form.Label>Codificación</Form.Label>
								<Form.Select value={charset} onChange={(e) => setCharset(e.target.value)} disabled={loading}>
									<option value="utf-8">UTF-8 (recomendado)</option>
									<option value="windows-1252">Windows-1252</option>
									<option value="iso-8859-1">ISO-8859-1</option>
								</Form.Select>
							</Form.Group>
						</Col>
						<Col sm={6} md={8} lg={9} className="d-flex align-items-end">
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
