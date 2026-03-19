
from .reporte_pdf import _styles, _ensure_file, _scale_image, _df_to_table, _kv_table, _footer
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
def build_reporte_pdf(
    output_pdf_path: Union[str, Path],
    root_path: Union[str, Path],
    assets_logo: Union[str, Path],
    assets_firma: Union[str, Path],  
    DF_cotizacion: pd.DataFrame,   
    DF_budget: pd.DataFrame,   
    DF_equipos: pd.DataFrame,
    resumen: Dict[str, Any],
    dict_informe: Dict[str, Any],
    dict_datos: Dict[str, Any]
) -> None:
    """
    Genera el PDF de 3 páginas.
    """

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
        title="Reporte TEC Energías Renovables",
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
        "TEC Soluciones Renovables SAC es una empresa de energías renovables en Perú, "
        "cuya misión es proporcionar soluciones de energía limpia y sostenible que "
        "sean rentables y asequibles para nuestros clientes.<br/><br/>"
        "Contamos con un equipo de especialistas comprometidos con la promoción de "
        "tecnologías fotovoltaicas. Ofrecemos desarrollo, instalación y "
        "mantenimiento de sistemas solares, soluciones para edificaciones "
        "sostenibles y consultoría en políticas de energía con responsabilidad "
        "ambiental. Esperamos tener la oportunidad de trabajar con ustedes y "
        "demostrar el valor de nuestras soluciones de energía renovable. "
        "Si tienen alguna consulta o deseen más información, no duden en ponerse "
        "en contacto con nosotros. Quedamos a la espera de su respuesta para "
        "atenderles de manera rápida y eficiente.", styles["body"]
    ))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("<b>Atentamente:</b>", styles["body"]))
    story.append(Spacer(1, 1 * cm))
    story.append(_scale_image(firma_path, max_w=12 * cm, max_h=4 * cm))
    story.append(Spacer(1, 0.5 * cm))

    # ---- Datos del cliente
    info_cliente = {
        "Nombre de la empresa": dict_datos['cliente'],
        "RUC / DNI": dict_datos['ruc_dni'],
        "Proyecto": dict_datos['proyecto'],
        "Fecha": dict_datos['fecha'],
        "Lugar": dict_datos['lugar'],
        "Encargado de atención": dict_datos['atencion']
    }

    story.append(Paragraph("Datos del cliente:", styles['h2']))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("<br/>".join([f"{k}: {v}" for k, v in info_cliente.items()]), styles["body"]))
    story.append(Spacer(1, 1 * cm))

    story.append(PageBreak())

    # ------------------------------------------------
    # 2) COTIZACIÓN
    # ------------------------------------------------
    story.append(Paragraph("Cotización", styles["h1"]))
    story.append(Spacer(1, 0.3 * cm))

    # Helper function to safely extract values
    def get_precio(df, descripcion):
        mask = df["Descripción"] == descripcion
        if mask.any():
            return df.loc[mask, "Precio"].iloc[0]
        else:
            print(f"Warning: '{descripcion}' not found in DF_cotizacion. Using 0.0")
            return 0.0

    # ----- Equipos y materiales
    precio_equipos = get_precio(DF_cotizacion, "Equipos Principales")

    equipos_header_data = [[
        Paragraph("EQUIPOS Y MATERIALES", styles["body"]),
        Paragraph(f"<b>$ {precio_equipos:,.2f}</b>")
    ]]
    equipos_header_table = Table(equipos_header_data, colWidths=[13*cm, 4*cm])
    equipos_header_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(equipos_header_table)

    story.append(Spacer(1, 0.3 * cm))
    equipos_col_widths = [9*cm, 4*cm, 4*cm]
    DF_equipos_copy = DF_equipos.copy()
    story.append(_df_to_table(DF_equipos_copy, 
                            col_widths=equipos_col_widths))
    story.append(Spacer(1, 0.3 * cm))

    # ----- Mano de obra (Puesta en marcha)
    precio_mano_obra = get_precio(DF_cotizacion, "Mano de obra")
    mano_obra_header_data = [[
        Paragraph("PUESTA EN MARCHA", styles["body"]),
        Paragraph(f"<b>$ {precio_mano_obra:,.2f}</b>")
    ]]
    mano_obra_header_table = Table(mano_obra_header_data, colWidths=[13*cm, 4*cm])
    mano_obra_header_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(mano_obra_header_table)
    story.append(Spacer(1, 0.3 * cm))
    mo_col_widths = [9*cm, 4*cm, 4*cm]
    DF_MO_copy = DF_budget.copy()
    story.append(_df_to_table(DF_MO_copy, 
                            col_widths=mo_col_widths))
    story.append(Spacer(1, 0.3 * cm))

    # ----- Total general
    story.append(Paragraph(f"MONTO TOTAL <br/>"))
    story.append(_kv_table(resumen, col_widths=(6 * cm, 4 * cm)))
    story.append(Spacer(1, 0.3 * cm))

    notas = [
        "Validez de la oferta:  15 días",
        f"Plazo de entrega: {dict_informe['plazo_entrega']} Semanas recepcionada la orden de servicio.",
    ]
    story.append(Paragraph("<br/>".join(notas), styles["body"]))

    story.append(PageBreak())

    # ------------------------------------------------
    # 3) NOTAS FINALES
    # ------------------------------------------------
    story.append(Paragraph("Notas finales", styles["h1"]))
    story.append(Spacer(1, 2 * cm))

    notas = [
        "Instalación completa del sistema solar fotovoltaico, incluyendo la conexión eléctrica y pruebas de funcionamiento.",
        "Incluye revisión de planos eléctricos.",
        "Incluye entrega de plano unifilar y mecánico del sistema instalado.",
        "Incluye entrega de manual de usuario.",
        "Incluye el cableado desde el inversor hasta el tablero donde se inyectará energía solar.",
        "Incluye estructuras adicionales a las necesarias para montar los paneles.",
        "Incluye transporte de materiales y equipos hasta la obra."
    ]
    notas_html = "<br/>".join([f"• {n}" for n in notas])
    story.append(Paragraph("<b>Suministro:</b><br/>", styles["h2"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(notas_html, styles["body"]))
    story.append(Spacer(1, 1 * cm))

    story.append(Paragraph(
        f"Vida útil del sistema: {dict_informe['vida_util_anios']} años<br/>"
        f"Paneles Solares: pérdida de {dict_informe['_%perdida']}% de potencia anual por los primeros 20 años<br/>"
        "Garantía de equipos: Según marca proveedora del equipo<br/><br/>",
        styles["body"]
    ))

    story.append(Paragraph("<b>Formas de pago:</b><br/>", styles["h2"]))
    story.append(Spacer(1, 0.5 * cm))
    notas_pago = [
        "30% Con la orden de servicio",
        "30% Antes del envío de equipos",
        "20% Antes del inicio de la instalación",
        "20% Al término de instalación<br/>",
        "",
        f"BCP S/: {dict_informe['BCP_soles']}",
        f"CCI  S/: {dict_informe['CCI_soles']}",
        f"BCP $ : {dict_informe['BCP_dolares']}",
        f"CCI  $ :  {dict_informe['CCI_dolares']}",
        f"CTA DETRACCIÓN: {dict_informe['CTA_detraccion']}",
    ]
    story.append(Paragraph("<br/>".join(notas_pago), styles["body"]))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("<b>Datos de TEC SOLUCIONES RENOVABLES S.A.C:</b><br/>", styles["h2"]))
    story.append(Spacer(1, 0.5 * cm))
    address = '<link href="' + 'http://www.tec-renovables.pe' + '">' + "www.tec-renovables.pe" + '</link>'
    notas_pago = [
        "RUC: 20612681466",
        "Calle: Cnel Luis Arias Schreiber 135, Miraflores",
        "Página Web: " + address,
        "Teléfono: +51 944590566<br/>",
    ]
    story.append(Paragraph("<br/>".join(notas_pago), styles["body"]))


    # Construir PDF
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)