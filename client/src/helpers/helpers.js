export function getTodayYmd() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export function ymdToDmy(ymd) {
  if (!ymd || !ymd.includes("-")) return ymd;
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Para el Excel, el backend espera un FormData con el 
// archivo y un campo "overrides_json" con un JSON 
// stringificado de las modificaciones a aplicar al reporte.
export function buildReportFormData(file) {
  const fd = new FormData();
  fd.append("excel_file", file, file.name);
  return fd;
}

export function isPdfResponse(res) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/pdf");
}

// Crea un enlace temporal para descargar 
// el blob y lo revoca después de usarlo.
export function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return objectUrl;
}

export async function parseErrorResponse(res) {
  const ct = res.headers.get("content-type") || "";

  try {
    if (ct.includes("application/json")) {
      const data = await res.json();
      return data?.detail ? String(data.detail) : JSON.stringify(data);
    }
    return await res.text();
  } catch {
    return `Error HTTP ${res.status}`;
  }
}