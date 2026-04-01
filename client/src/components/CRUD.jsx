import { useEffect, useRef, useState } from "react";
import {
    getProjectsRequest,
    updateProjectRequest,
    deleteProjectRequest,
    createProjectRequest,
    processProjectRequest,
    downloadExcelRequest,
    generateQuotePdfRequest,
    generateFinancialPdfRequest,
} from "../api/projects.api";
import * as helpers from "../helpers/helpers";

import GRAPHS from "./GRAPHS";

function CRUD() {

    // -------------------- STATES ----------------------------
    const statuses = ["activo", "culminado", "pausa"];

    // File Upload State
    const [excelFile, setExcelFile] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectExcelFiles, setProjectExcelFiles] = useState({});

    // PDF Generation State
    const [busy_quote, setBusy_quote] = useState(false);
    const [busy_financial, setBusy_financial] = useState(false);
    const [busy_excel, setBusy_excel] = useState(false);
    const [message_quote, setMessage_quote] = useState("");
    const [message_financial, setMessage_financial] = useState("");
    const [message_excel, setMessage_excel] = useState("");
    const [messageType_quote, setMessageType_quote] = useState("info");
    const [messageType_financial, setMessageType_financial] = useState("info");
    const [messageType_excel, setMessageType_excel] = useState("info");

    // Projects Data State
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalProjectId, setStatusModalProjectId] = useState(null);
    const [statusModalCurrent, setStatusModalCurrent] = useState("activo");
    const [statusModalSelection, setStatusModalSelection] = useState("activo");
    const [statusSaving, setStatusSaving] = useState(false);
    
    // Ref to prevent infinite loops
    const hasInitialized = useRef(false);

    // -------------------- EVENTS ----------------------------

    // Change Excel File
    const onFileChange = (event) => {
        setExcelFile(event.target.files?.[0] || null);
    };

    // Load Projects Function
    const loadProjects = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getProjectsRequest();
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "Unable to load projects");
            }

            const projectData = Array.isArray(payload.data) ? payload.data : [];
            setProjects(projectData);

            const resolvedProjectId = helpers.resolveSelectedProjectId(selectedProjectId, projectData);
            setSelectedProjectId(resolvedProjectId);
        } catch (err) {
            setError(err.message || "Unable to load projects");
        } finally {
            setLoading(false);
        }
    };

    // Upload Excel file
    const onUpload = async () => {
        if (!excelFile) {
            alert("Por favor, selecciona un archivo Excel antes de subir.");
            return;
        }

        try {
            const shouldCreateNewProject = true; // evita la sobrescritura de proyectos existentes al subir un nuevo Excel
            let projectIdToUse = shouldCreateNewProject ? null : helpers.resolveSelectedProjectId(selectedProjectId, projects);

            if (projectIdToUse == null) {
                const baseProject = {
                    project: "Proyecto",
                    time_retorn: 0,
                    price: 0,
                    nro_panels: 0,
                    status: "activo",
                };

                const createResponse = await createProjectRequest(baseProject);
                const createPayload = await createResponse.json();

                if (!createResponse.ok || !createPayload.success || !createPayload.data?.id) {
                    throw new Error(createPayload.message || "No se pudo crear el proyecto base");
                }

                projectIdToUse = createPayload.data.id;
                setSelectedProjectId(projectIdToUse);
                setProjects((prev) => [createPayload.data, ...prev]);
            }

            if (projectIdToUse == null) {
                throw new Error("No hay un proyecto válido para asociar el Excel.");
            }

            // Store the file in state associated with the project
            setProjectExcelFiles((prev) => ({
                ...prev,
                [projectIdToUse]: excelFile,
            }));

            // Process and persist metrics directly in Python server
            const formData = new FormData();
            formData.append("excel_file", excelFile, excelFile.name);
            formData.append("project_id", String(projectIdToUse));

            const req = await processProjectRequest(formData);

            if (!req.ok) {
                const errPayload = await req.json().catch(() => null);
                const detail = errPayload?.detail || errPayload?.message || req.statusText;
                throw new Error(detail);
            }

            const data = await req.json();
            alert("Excel procesado y proyecto actualizado exitosamente.");
            console.log("Respuesta del servidor:", data);
            setExcelFile(null);
            loadProjects();
        } catch (err) {
            alert(`Error al subir el archivo: ${err.message}`);
            console.error(err);
        }
    };

    // Download Excel file handler
    const DownloadExcel = async (
        setMessage_excel,
        setMessageType_excel,
        setBusy_excel,
        projectId
    ) => {
        setMessage_excel("Descargando...");
        setMessageType_excel("info");
        setBusy_excel(true);

        try {
            // 1) Si el archivo esta en memoria (recien subido), descargalo directo
            const localFile = projectExcelFiles[projectId];
            if (localFile) {
                helpers.downloadBlob(localFile, localFile.name || `project_${projectId}.xlsx`);
                setMessage_excel("Excel descargado.");
                setMessageType_excel("ok");
                return;
            }

            // 2) Fallback: pedir el Excel persistido al backend
            const res = await downloadExcelRequest(projectId);

            if (!res.ok) {
                throw new Error(await helpers.parseErrorResponse(res));
            }

            const blob = await res.blob();
            const filename = helpers.getFilenameFromDisposition(
                res.headers.get("content-disposition"),
                `project_${projectId}.xlsx`
            );
            helpers.downloadBlob(blob, filename);
            setMessage_excel("Excel descargado.");
            setMessageType_excel("ok");
        } catch (error) {
            console.error(error);
            setMessage_excel(`Error: ${error.message}`);
            setMessageType_excel("err");
        } finally {
            setBusy_excel(false);
        }
    };

    // PDF Generation Handler
    const generatePdf = async (reportType, setMessage, setMessageType, setBusy, filename, projectId) => {
        setMessage("Generando...");
        setMessageType("info");

        setBusy(true);
        try {
            let projectFile = projectExcelFiles[projectId];

            // Fallback tras refresh: recuperar Excel persistido desde backend
            if (!projectFile) {
                const projectMeta = projects.find((p) => p.id === projectId);
                if (!projectMeta?.excel_file_path) {
                    setMessage("No hay archivo Excel asociado a este proyecto.");
                    setMessageType("err");
                    return;
                }

                const excelRes = await downloadExcelRequest(projectId);
                if (!excelRes.ok) {
                    throw new Error(await helpers.parseErrorResponse(excelRes));
                }

                const excelBlob = await excelRes.blob();
                const inferredName = helpers.getFilenameFromDisposition(
                    excelRes.headers.get("content-disposition"),
                    `project_${projectId}.xlsx`
                );

                projectFile = new File([excelBlob], inferredName, {
                    type: excelBlob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
            }

            const formData = helpers.buildReportFormData(projectFile);

            const res = reportType === "quote"
                ? await generateQuotePdfRequest(formData)
                : await generateFinancialPdfRequest(formData);
            if (!res.ok) {
                throw new Error(await helpers.parseErrorResponse(res));
            }

            if (!helpers.isPdfResponse(res)) {
                const text = await res.text();
                throw new Error(`Respuesta no-PDF del backend: ${text.slice(0, 200)}`);
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            setMessage("PDF generado. Descarga iniciada.");
            setMessageType("ok");
            window.open(objectUrl, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            console.error(error);
            setMessage(`Error: ${error.message}`);
            setMessageType("err");
        } finally {
            setBusy(false);
        }
    };

    // Load Projects on Mount
    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            loadProjects();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Change status project
    const openStatusModal = (projectId, currentStatus) => {
        const current = (currentStatus || "activo").toLowerCase();
        setStatusModalProjectId(projectId);
        setStatusModalCurrent(current);
        setStatusModalSelection(current);
        setStatusModalOpen(true);
    };

    const closeStatusModal = () => {
        if (statusSaving) {
            return;
        }
        setStatusModalOpen(false);
        setStatusModalProjectId(null);
        setStatusModalCurrent("activo");
        setStatusModalSelection("activo");
    };

    const confirmStatusChange = async () => {
        if (!statusModalProjectId) {
            closeStatusModal();
            return;
        }

        if (!statuses.includes(statusModalSelection)) {
            alert("Estado inválido.");
            return;
        }
        if (statusModalSelection === statusModalCurrent) {
            closeStatusModal();
            return;
        }

        try {
            setStatusSaving(true);
            const response = await updateProjectRequest(statusModalProjectId, { status: statusModalSelection });
            const payload = await response.json();
            
            if (!response.ok || !payload.success) {
                alert(`Error al actualizar: ${payload.message || 'Error desconocido'}`);
                return;
            }
            
            await loadProjects();
            closeStatusModal();
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setStatusSaving(false);
        }
    };

    // Delete project
    const handleDelete = async (projectId) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este proyecto?')) {
            return;
        }
        
        try {
            const response = await deleteProjectRequest(projectId);
            const payload = await response.json();
            
            if (!response.ok || !payload.success) {
                alert(`Error al eliminar: ${payload.message || 'Error desconocido'}`);
                return;
            }
            
            loadProjects();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <>
        {/* Excel Upload Section */}
        <section className="card-section">
            <div className="form-group">
                <h2>Suba su archivo Excel</h2>
                <label className="field">
                    <input
                        id="excelFile"
                        type="file"
                        accept=".xlsx,.xlsm,.xls"
                        onChange={onFileChange}
                    />
                    <small className="hint">Formatos permitidos: .xlsx / .xlsm / .xls</small>
                </label>
                <button id="btn" className="btn" onClick={onUpload}>
                    Subir Excel
                </button>
            </div>
        </section>

        {/* Projects Management Section */}
        <section className="card-section">
            {/* Statistics Cards */}
            <section className="stats-grid">
                <article className="stat-card stat-projects">
                    <p className="stat-label">Proyectos registrados</p>
                    <p className="stat-value">{projects.length}</p>
                </article>
                <article className="stat-card stat-panels">
                    <p className="stat-label">Paneles instalados</p>
                    <p className="stat-value">
                        {projects.reduce((sum, project) => sum + project.nro_panels, 0)}
                    </p>
                </article>
            </section>

            {/* Projects Header */}
            <div className="section-header">
                <h2>Proyectos cargados</h2>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="loading-message">Cargando proyectos...</div>
            )}

            {/* Error State */}
            {!loading && error && (
                <div className="error-message">{error}</div>
            )}

            {/* Empty State */}
            {!loading && !error && projects.length === 0 && (
                <div className="empty-message">No hay proyectos cargados aún.</div>
            )}

            {/* Projects Table */}
            {!loading && !error && projects.length > 0 && (
                <div className="table-wrapper">
                    <table className="projects-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Precio de venta</th>
                                <th>N° paneles</th>
                                <th>Tiempo de retorno (años)</th>
                                <th>Estado</th>
                                <th>Actualizado</th>
                                <th>Excel</th>
                                <th>Cotizaciones</th>
                                <th>Finanzas</th>
                                <th>Editar</th>
                                <th>Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((project) => (
                                <tr key={project.id}>
                                    <td>{project.project}</td>
                                    <td>
                                        {helpers.formatCurrency(project.price ?? project.Price ?? 0)}
                                    </td>
                                    <td>
                                        {project.nro_panels ?? project.Nro_panels ?? 0}
                                    </td>
                                    <td>
                                        {project.time_retorn ?? project.time_retorn ?? 0}
                                    </td>
                                    <td>
                                        <span className="status-badge">
                                            {project.status}
                                        </span>
                                    </td>
                                    <td>
                                        {new Date(project.updated_at).toLocaleDateString("en-US")}
                                    </td>
                                    <td>
                                        <button 
                                            id="btnGenerate_excel"
                                            className="btn-secondary"
                                            disabled={busy_excel || (!projectExcelFiles[project.id] && !project.excel_file_path)}
                                            onClick={() => DownloadExcel(setMessage_excel, setMessageType_excel, setBusy_excel, project.id)}>
                                            Descargar Excel
                                        </button>
                                        <div className="status">
                                            {busy_excel && <div className="spinner" aria-hidden="true"></div>}
                                            <span className={`msg ${messageType_excel === "ok" ? "ok" : messageType_excel === "err" ? "err" : ""}`}>{message_excel}</span>
                                        </div>                                        
                                    </td>
                                    <td>
                                        <button 
                                            id="btnGenerate_quote"
                                            className="btn-secondary"
                                            disabled={busy_quote || (!projectExcelFiles[project.id] && !project.excel_file_path)}
                                            onClick={() => generatePdf("quote", setMessage_quote, setMessageType_quote, setBusy_quote, 'reporte_final_quote.pdf', project.id)}>
                                            Abrir PDF
                                        </button>
                                        <div className="status">
                                            {busy_quote && <div className="spinner" aria-hidden="true"></div>}
                                            <span className={`msg ${messageType_quote === "ok" ? "ok" : messageType_quote === "err" ? "err" : ""}`}>{message_quote}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            id="btnGenerate_finantial"
                                            className="btn-secondary"
                                            disabled={busy_financial || (!projectExcelFiles[project.id] && !project.excel_file_path)}
                                            onClick={() => generatePdf("finantial", setMessage_financial, setMessageType_financial, setBusy_financial, 'reporte_final_finantial.pdf', project.id)}>
                                            Abrir PDF
                                        </button>
                                        <div className="status">
                                            {busy_financial && <div className="spinner" aria-hidden="true"></div>}
                                            <span className={`msg ${messageType_financial === "ok" ? "ok" : messageType_financial === "err" ? "err" : ""}`}>{message_financial}</span>
                                        </div>                                        
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => openStatusModal(project.id, project.status)}>
                                            Cambiar Estado
                                        </button>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => handleDelete(project.id)}>
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
        {statusModalOpen && (
            <div className="modal-backdrop" role="presentation" onClick={closeStatusModal}>
                <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                    <h3>Cambiar estado del proyecto</h3>
                    <p>Estado actual: <strong>{statusModalCurrent}</strong></p>
                    <label className="field">
                        <span className="label-text">Nuevo estado</span>
                        <select
                            className="select-field"
                            value={statusModalSelection}
                            onChange={(e) => setStatusModalSelection(e.target.value)}
                            disabled={statusSaving}
                        >
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={closeStatusModal} disabled={statusSaving}>
                            Cancelar
                        </button>
                        <button className="btn-secondary btn-primary-inline" onClick={confirmStatusChange} disabled={statusSaving}>
                            {statusSaving ? "Guardando..." : "Guardar cambio"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* Statistics Charts */}
        {projects.length > 0 && (
            <GRAPHS projects={projects}/>
        )}
        </>
    );
}

export default CRUD;
