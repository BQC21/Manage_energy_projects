import { useEffect, useRef, useState } from "react";
import { getProjectsRequest, updateProjectRequest, deleteProjectRequest, createProjectRequest } from "../api/projects.api";
import * as helpers from "../helpers/helpers";

// precio de venta
function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(value);
}

// LCOE
function formatLCOE(value) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

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

    // API Configuration
    const BACKEND_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const ENDPOINT_quote = `${BACKEND_BASE}/api/reports/quote`;
    const ENDPOINT_financial = `${BACKEND_BASE}/api/reports/finantial`;
    const ENDPOINT_process = `${BACKEND_BASE}/api/reports/process-project`;
    const ENDPOINT_download_excel = `${BACKEND_BASE}/api/reports/download-excel`;

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
            if (projectData.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectData[0].id);
            }
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
            let projectIdToUse = selectedProjectId;

            if (projectIdToUse == null && projects.length === 0) {
                const baseProject = {
                    project: "Proyecto inicial",
                    LCOE: 0,
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

            const req = await fetch(ENDPOINT_process, {
                method: "POST",
                body: formData,
            });

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
        ENDPOINT_download_excel,
        setMessage_excel,
        setMessageType_excel,
        setBusy_excel,
        projectId
    ) => {
        setMessage_excel("Descargando...");
        setMessageType_excel("info");
        setBusy_excel(true);

        try {
            // 1) Si el archivo está en memoria (recién subido), descárgalo directo
            const localFile = projectExcelFiles[projectId];
            if (localFile) {
                const localUrl = URL.createObjectURL(localFile);
                const link = document.createElement("a");
                link.href = localUrl;
                link.download = localFile.name || `project_${projectId}.xlsx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(localUrl), 1000);

                setMessage_excel("Excel descargado.");
                setMessageType_excel("ok");
                return;
            }

            // 2) Fallback: pedir el Excel persistido al backend
            // Cambia /process-project por /download-excel
            const downloadEndpoint = ENDPOINT_process.replace(/process-project\/?$/, "download-excel");
            const res = await fetch(`${downloadEndpoint}?project_id=${projectId}`, {
                method: "GET",
            });

            if (!res.ok) {
                throw new Error(await helpers.parseErrorResponse(res));
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            const disposition = res.headers.get("content-disposition") || "";
            const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
            const filename = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : `project_${projectId}.xlsx`;

            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
    const generatePdf = async (ENDPOINT, setMessage, setMessageType, setBusy, filename, projectId) => {
        setMessage("Generando...");
        setMessageType("info");

        const projectFile = projectExcelFiles[projectId];
        if (!projectFile) {
            setMessage("No hay archivo Excel asociado a este proyecto.");
            setMessageType("err");
            return;
        }

        const formData = helpers.buildReportFormData(projectFile);

        setBusy(true);
        try {
            const res = await fetch(ENDPOINT, { method: "POST", body: formData });
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
                                <th>LCOE ($/kWh)</th>
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
                                        {formatCurrency(project.price ?? project.Price ?? 0)}
                                    </td>
                                    <td>
                                        {project.nro_panels ?? project.Nro_panels ?? 0}
                                    </td>
                                    <td>
                                        {formatLCOE(project.LCOE ?? project.lcoe ?? 0)}
                                    </td>
                                    <td>
                                        <span className="status-badge">
                                            {project.status}
                                        </span>
                                    </td>
                                    <td>
                                        {new Date(project.updated_at).toLocaleDateString("en-US")}
                                    </td>
                                    {/* <td>
                                        {projectExcelFiles[project.id] ? (
                                            <span className="file-name">{projectExcelFiles[project.id].name}</span>
                                        ) : (
                                            <span className="no-file">No Excel</span>
                                        )}
                                    </td> */}
                                    <td>
                                        <button 
                                            id="btnGenerate_excel"
                                            className="btn-secondary"
                                            disabled={busy_excel || (!projectExcelFiles[project.id] && !project.excel_file_path)}
                                            onClick={() => DownloadExcel(ENDPOINT_download_excel, setMessage_excel, setMessageType_excel, setBusy_excel, project.id)}>
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
                                            disabled={busy_quote || !projectExcelFiles[project.id]}
                                            onClick={() => generatePdf(ENDPOINT_quote, setMessage_quote, setMessageType_quote, setBusy_quote, 'reporte_final_quote.pdf', project.id)}>
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
                                            disabled={busy_financial || !projectExcelFiles[project.id]}
                                            onClick={() => generatePdf(ENDPOINT_financial, setMessage_financial, setMessageType_financial, setBusy_financial, 'reporte_final_finantial.pdf', project.id)}>
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
        </>
    );
}

export default CRUD;
