import { useEffect, useState } from "react";
import * as helpers from "../helpers/helpers";

function PDF_generator() {
        // state for file upload and quote/financial results
        const [excelFile, setExcelFile] = useState(null);
        const [busy_quote, setBusy_quote] = useState(false);
        const [busy_financial, setBusy_financial] = useState(false);
        const [message_quote, setMessage_quote] = useState("");
        const [message_financial, setMessage_financial] = useState("");
        const [messageType_quote, setMessageType_quote] = useState("info");
        const [messageType_financial, setMessageType_financial] = useState("info");
        const [pdfObjectUrl_quote, setPdfObjectUrl_quote] = useState(null);
        const [pdfObjectUrl_financial, setPdfObjectUrl_financial] = useState(null);
    
        const BACKEND_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const ENDPOINT_quote = `${BACKEND_BASE}/api/reports/quote`;
        const ENDPOINT_financial = `${BACKEND_BASE}/api/reports/finantial`;
    
        useEffect(() => {
            return () => {
                if (pdfObjectUrl_quote) URL.revokeObjectURL(pdfObjectUrl_quote);
                if (pdfObjectUrl_financial) URL.revokeObjectURL(pdfObjectUrl_financial);
            };
        }, [pdfObjectUrl_quote, pdfObjectUrl_financial]);
    
        const onFileChange = (event) => {
            setExcelFile(event.target.files?.[0] || null);
        };
    
        const generatePdf = async (pdfObjectUrl, setPdfObjectUrl, 
            ENDPOINT, setMessage, setMessageType, setBusy, filename) => {
            setMessage("Generando...");
            setMessageType("info");
    
            if (pdfObjectUrl) {
                URL.revokeObjectURL(pdfObjectUrl);
                setPdfObjectUrl(null);
            }
    
            if (!excelFile) {
                setMessage("Te falta subir el Excel.");
                setMessageType("err");
                return;
            }
    
            const formData = helpers.buildReportFormData(excelFile);
    
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
                const objectUrl = helpers.downloadBlob(blob, filename);
                setPdfObjectUrl(objectUrl);
                setMessage("PDF generado. Descarga iniciada.");
                setMessageType("ok");
            } catch (error) {
                console.error(error);
                setMessage(`Error: ${error.message}`);
                setMessageType("err");
            } finally {
                setBusy(false);
            }
        };
    
    
        const openPdf= (pdfObjectUrl) => {
            if (!pdfObjectUrl) return;
            window.open(pdfObjectUrl, "_blank", "noopener,noreferrer");
        };

    return (
    <>
        <div className="cards-matrix">
            <section className="card quote-card">
                <div className="cards-matrix">
                    <h2>Suba su archivo Excel</h2>
                    <label className="field">
                        <input
                            id="excelFile"
                            type="file"
                            accept=".xlsx,.xlsm,.xls"
                            disabled={busy_quote || busy_financial}
                            onChange={onFileChange}
                        />
                        <small className="hint">Formatos permitidos: .xlsx / .xlsm / .xls</small>
                    </label>
                </div>
                {/* PDF de reporte*/}
                <div className="cards-matrix">
                    <h2>Reporte de cotización:</h2>
                    <div className="actions">
                        <button id="btnGenerate_quote" className="btn_quote primary" disabled={busy_quote} onClick={() => generatePdf(pdfObjectUrl_quote, setPdfObjectUrl_quote, ENDPOINT_quote, setMessage_quote, setMessageType_quote, setBusy_quote, 'reporte_final_quote.pdf')}>Generar PDF</button>
                        <button id="btnOpen_quote" className="btn_quote" disabled={busy_quote || !pdfObjectUrl_quote} onClick={() => openPdf(pdfObjectUrl_quote)}>Abrir PDF</button>
                    </div>

                    <div className="status">
                        {busy_quote && <div className="spinner" aria-hidden="true"></div>}
                        <span className={`msg ${messageType_quote === "ok" ? "ok" : messageType_quote === "err" ? "err" : ""}`}>{message_quote}</span>
                    </div>
                </div>
                {/* PDF de analisis financiero*/}
                <div className="cards-matrix">
                    <h2>Reporte de análisis financiero:</h2>
                    <div className="actions">
                        <button id="btnGenerate_finantial" className="btn_finantial primary" disabled={busy_financial} onClick={() => generatePdf(pdfObjectUrl_financial, setPdfObjectUrl_financial, ENDPOINT_financial, setMessage_financial, setMessageType_financial, setBusy_financial, 'reporte_final_finantial.pdf')}>Generar PDF</button>
                        <button id="btnOpen_finantial" className="btn_finantial" disabled={busy_financial || !pdfObjectUrl_financial} onClick={() => openPdf(pdfObjectUrl_financial)}>Abrir PDF</button>
                    </div>

                    <div className="status">
                        {busy_financial && <div className="spinner" aria-hidden="true"></div>}
                        <span className={`msg ${messageType_financial === "ok" ? "ok" : messageType_financial === "err" ? "err" : ""}`}>{message_financial}</span>
                    </div>
                </div>
            </section>
        </div>
    </>
    );
}

export default PDF_generator;