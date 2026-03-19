from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import pandas as pd

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# -----------------------------
# Tipografías
# -----------------------------
def _register_fonts() -> None:
    """
    Registra una fuente TrueType si existe en el sistema.
    Si no existe, ReportLab usará Helvetica por defecto.
    """
    # Deja esto robusto: si no hay archivo, no pasa nada.
    candidates = [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold"),
    ]
    for fpath, name in candidates:
        p = Path(fpath)
        if p.exists():
            try:
                pdfmetrics.registerFont(TTFont(name, str(p)))
            except Exception:
                pass


# -----------------------------
# Estilos
# -----------------------------
def _styles():
    _register_fonts()
    base = getSampleStyleSheet()

    # Si registró DejaVuSans, úsala; si no, Helvetica.
    font_regular = "DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    font_bold = "DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

    base["Normal"].fontName = font_regular
    base["Normal"].fontSize = 10
    base["Normal"].leading = 14

    title = ParagraphStyle(
        "TitleCustom",
        parent=base["Title"],
        fontName=font_bold,
        fontSize=22,
        leading=26,
        alignment=TA_CENTER,
        spaceAfter=12,
        textColor=colors.HexColor("#0B3D91"),
    )
    h1 = ParagraphStyle(
        "H1Custom",
        parent=base["Heading1"],
        fontName=font_bold,
        fontSize=17,
        leading=20,
        alignment=TA_CENTER,
        spaceBefore=6,
        spaceAfter=10,
        textColor=colors.HexColor("#0B3D91"),
    )
    h2 = ParagraphStyle(
        "H2Custom",
        parent=base["Heading2"],
        fontName=font_bold,
        fontSize=12,
        leading=16,
        spaceBefore=8,
        spaceAfter=6,
        textColor=colors.HexColor("#000000"),
    )
    body = ParagraphStyle(
        "BodyCustom",
        parent=base["Normal"],
        fontName=font_regular,
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
    )
    small = ParagraphStyle(
        "SmallCustom",
        parent=base["Normal"],
        fontName=font_regular,
        fontSize=9,
        leading=12,
        alignment=TA_LEFT,
    )
    return {"base": base, "title": title, "h1": h1, "h2": h2, "body": body, 
            "small": small, "font_regular": font_regular, "font_bold": font_bold}


# -----------------------------
# Utilidades
# -----------------------------
def _ensure_file(path: Union[str, Path], label: str) -> Path:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"No se encontró {label}: {p}")
    return p


def _fmt_value(v: Any) -> str:
    if v is None:
        return "-"
    if isinstance(v, float):
        # Evita notación científica fea
        return f"{v:,.4f}".rstrip("0").rstrip(".")
    return str(v)


def _safe_num_fmt(v: Any, decimals: int = 2, suffix: str = "") -> str:
    """
    Formatea un valor numérico con separador de miles y decimales.
    Si `v` no es convertible a float, devuelve una representación segura usando `_fmt_value`.
    """
    if v is None:
        return _fmt_value(v)
    try:
        num = float(v)
    except Exception:
        # Fallback: vuelve a la representación por defecto (strings, etc.)
        base = _fmt_value(v)
        return f"{base} {suffix}".strip()
    fmt_str = f"{{:,.{decimals}f}}"
    return fmt_str.format(num) + (f" {suffix}" if suffix else "")


def _kv_table(data: Dict[str, Any], col_widths: Tuple[float, float]) -> Table:
    rows = [["Característica", "Valor"]]
    for k, v in data.items():
        rows.append([str(k), _fmt_value(v)])

    t = Table(rows, colWidths=list(col_widths), hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#13B1AB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FF")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def _df_to_table(df: pd.DataFrame, max_rows: Optional[int] = None, col_widths: Optional[List[float]] = None) -> Table:
    if max_rows is not None and len(df) > max_rows:
        df = df.head(max_rows).copy()

    # convierte a strings
    data = [list(df.columns)]
    for _, row in df.iterrows():
        data.append([_fmt_value(x) for x in row.tolist()])

    t = Table(data, colWidths=col_widths, repeatRows=1, hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D91")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FF")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def _split_df(df: pd.DataFrame, rows_per_chunk: int) -> List[pd.DataFrame]:
    return [df.iloc[i:i + rows_per_chunk].copy() for i in range(0, len(df), rows_per_chunk)]


def _scale_image(path: Path, max_w: float, max_h: float) -> Image:
    img = Image(str(path))
    iw, ih = img.imageWidth, img.imageHeight
    if iw <= 0 or ih <= 0:
        return img
    scale = min(max_w / iw, max_h / ih)
    img.drawWidth = iw * scale
    img.drawHeight = ih * scale
    return img


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.grey)
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.restoreState()