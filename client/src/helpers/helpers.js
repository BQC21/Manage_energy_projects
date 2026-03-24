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

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLCOE(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function resolveSelectedProjectId(selectedProjectId, projects) {
  const rows = Array.isArray(projects) ? projects : [];
  if (rows.length === 0) return null;
  const hasSelected = rows.some((p) => p.id === selectedProjectId);
  if (hasSelected) return selectedProjectId;
  return rows[0].id;
}

export function buildReportFormData(file) {
  const fd = new FormData();
  fd.append("excel_file", file, file.name);
  return fd;
}

export function isPdfResponse(res) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/pdf");
}

export function getFilenameFromDisposition(contentDisposition, fallbackName) {
  const disposition = contentDisposition || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return fallbackName;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ""));
  } catch {
    return fallbackName;
  }
}

// Crea un enlace temporal para descargar el blob y revoca la URL luego.
export function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
