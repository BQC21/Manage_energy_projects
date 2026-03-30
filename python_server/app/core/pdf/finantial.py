
from .reporte_pdf import _styles, _ensure_file, _scale_image, _df_to_table, _kv_table, _footer, _split_df
from ..functions import construir_gastos, total_cot, cf_table, finantial_table, generar_graficas
from ..configs import build_config
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from openpyxl import load_workbook
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from typing import Any, Dict, List, Union


# -----------------------------
# MAIN FUNCTION
# -----------------------------
def build_reporte_pdf_finantial(
    output_pdf_path: Union[str, Path],
    root_path: Union[str, Path],
    assets_logo: Union[str, Path],
    assets_firma: Union[str, Path],  
    DF_CF: pd.DataFrame,
    DF_FINANTIAL: pd.DataFrame,
    DF_PLOTS: List[Path],
    dict_datos: Dict[str, Any]
) -> None:

    styles = _styles()
    root_path = Path(root_path)
    output_pdf_path = Path(output_pdf_path)
    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)

    # Resolve assets
    logo_path = _ensure_file(assets_logo, "logo")
    firma_path = _ensure_file(assets_firma, "firma")

    # Construcción del documento
    doc = SimpleDocTemplate(
        str(output_pdf_path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title="Análisis Financiero del Proyecto Fotovoltaico",
        author="TEC Soluciones Renovables SAC",
    )

    story: List[Any] = []

    # ------------------------------------------------
    # 1) PORTADA
    # ------------------------------------------------
    story.append(Spacer(1, 0.6 * cm))
    story.append(_scale_image(logo_path, max_w=5 * cm, max_h=5 * cm))
    story.append(Spacer(1, 2 * cm))

    story.append(Paragraph(
        f"Estimados de la empresa <b>{dict_datos['cliente']}</b> :<br/><br/>"
        "Este análisis financiero tiene como objetivo mostrar si la instalación de un sistema solar fotovoltaico de "
        "31.875 kWp es una buena inversión. Para ello, se consideran el costo inicial del sistema, los gastos de "
        "mantenimiento y los ahorros que se obtienen al producir energía propia y comprar menos electricidad de la red.", styles["body"]
    ))
    story.append(Paragraph("Parámetros principales del proyecto", styles["h1"]))
    story.append(Spacer(1, 0.3 * cm))

    finantial_col_widths = [9*cm, 4*cm, 4*cm]
    DF_FINANTIAL_copy = DF_FINANTIAL.copy()
    story.append(_df_to_table(DF_FINANTIAL_copy, col_widths=finantial_col_widths))
    story.append(Spacer(1, 0.3 * cm))

    story.append(PageBreak())
    story.append(Paragraph("Flujo de caja del proyecto", styles["h1"]))
    story.append(Spacer(1, 0.3 * cm))

    # Mantiene la tabla dentro del ancho util del A4 y la divide
    # en bloques para evitar que desaparezca por problemas de layout.
    cf_col_widths = [1.4 * cm, 2.2 * cm, 1.6 * cm, 1.6 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm, 2.5 * cm]
    DF_CF_copy = DF_CF.copy()
    story.append(_df_to_table(DF_CF_copy, col_widths=cf_col_widths))
    story.append(Spacer(1, 0.3 * cm))

    # ------------------------------------------------
    # 2) Gráficas financieras
    # ------------------------------------------------
    
    plot_desc = [
        "<b>Figura 1:</b> Componentes del flujo de caja por año (Equipamiento, Ahorro, OPEX).",
        "<b>Figura 2:</b> Flujo acumulado por año."]

    for plot_path, desc in zip(DF_PLOTS, plot_desc):
        story.append(_scale_image(plot_path, max_w=16*cm, max_h=12*cm))
        story.append(Paragraph(desc))
        story.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------
    # 3) NOTAS FINALES
    # ------------------------------------------------
    conclusiones = [
        "Beneficio económico a largo plazo: El análisis muestra que el proyecto genera un beneficio económico total equivalente a 31,228 USD a lo largo de su vida útil, lo que confirma que es una inversión rentable.",
        "Recuperación de la inversión: La inversión inicial del sistema solar se recupera en un plazo aproximado de 4.1 años, momento a partir del cual los ahorros generados se convierten en beneficios económicos netos para el usuario, como se observa en la Figura 2.",
        "Ahorro anual desde el primer año: El sistema fotovoltaico permite reducir el gasto en electricidad desde el primer año de operación, generando ahorros anuales constantes que aumentan a lo largo del tiempo, tal como se muestra en la Figura 1." 
    ]
    conclusiones_html = "<br/>".join([f"• {c}" for c in conclusiones])
    story.append(Paragraph("<b>Conclusiones:</b><br/>", styles["h2"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(conclusiones_html, styles["body"]))
    story.append(Spacer(1, 1 * cm))

    story.append(Spacer(1, 1 * cm))
    story.append(_scale_image(firma_path, max_w=12 * cm, max_h=4 * cm))
    story.append(Spacer(1, 0.5 * cm))

    # Construir PDF
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
