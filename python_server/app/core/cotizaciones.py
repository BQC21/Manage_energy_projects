# backend/app/core/cotizaciones.py
from __future__ import annotations

import warnings
from pathlib import Path
from typing import Optional, Union

from openpyxl import load_workbook

from .configs import build_config
from .functions import construir_gastos, total_cot 
from .functions import cf_table, finantial_table, generar_graficas
from .pdf.quote import build_reporte_pdf
from .pdf.finantial import build_reporte_pdf_finantial

warnings.filterwarnings("ignore")


def _resolve_root_path(cfg: dict) -> Path:
    root_cfg = cfg.get("data_roots", {}).get("ROOT_PATH")
    if not root_cfg:
        raise ValueError("CFG['data_roots']['ROOT_PATH'] está vacío.")
    return Path(root_cfg).resolve()

def generate_report_quote(CFG: dict, ws, dict_datos: dict, assets: dict, output_pdf_path: Optional[Union[str, Path]] = None) -> Path:
    if ws is None:
        raise ValueError("Se requiere una hoja de Excel válida para generar la cotización.")

    root_path = _resolve_root_path(CFG)

    # ====================================================
    # Quote
    # ====================================================
    df_gastos, df_equipos, df_principal = construir_gastos(
        ws,
        CFG["parametros_busqueda_BUDGET"]["minimo_vector_EQUIPOS"],
        CFG["parametros_busqueda_BUDGET"]["maximo_vector_EQUIPOS"],
        CFG["parametros_busqueda_BUDGET"]["minimo_vector_MO"],
        CFG["parametros_busqueda_BUDGET"]["maximo_vector_MO"],
        CFG["parametros_busqueda_BUDGET"]["column_equipos_desc"],
        CFG["parametros_busqueda_BUDGET"]["column_equipos_cant"],
        CFG["parametros_busqueda_BUDGET"]["column_equipos_uni"],
        CFG["parametros_busqueda_BUDGET"]["column_precio_EQUIPOS"],
        CFG["parametros_busqueda_BUDGET"]["row_precio_EQUIPOS"],
        CFG["parametros_busqueda_BUDGET"]["column_precio_MO"],
        CFG["parametros_busqueda_BUDGET"]["row_precio_MO"],
    )
    print(df_equipos)

    # ====================================================
    # Resumen
    # ====================================================
    resumen = total_cot(
        df_principal,
    )

    # Multiusuario: si no te pasan output, conserva el comportamiento viejo
    if output_pdf_path is None:
        output_pdf_path = root_path / "Outputs" / "reporte_final.pdf"
    else:
        output_pdf_path = Path(output_pdf_path)

    output_pdf_path = output_pdf_path.resolve()
    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)

    build_reporte_pdf(
        output_pdf_path=output_pdf_path,
        root_path=root_path,
        assets_logo=assets["logo"],
        assets_firma=assets["firma"],
        DF_cotizacion=df_principal,
        DF_budget=df_gastos,
        DF_equipos=df_equipos,
        resumen=resumen,
        dict_informe=CFG["datos_informe"],
        dict_datos=dict_datos,
    )

    return output_pdf_path

def generate_report_finantial(CFG: dict, ws, dict_datos: dict, assets: dict, output_pdf_path: Optional[Union[str, Path]] = None) -> Path:
    if ws is None:
        raise ValueError("Se requiere una hoja de Excel válida para generar el análisis financiero.")

    root_path = _resolve_root_path(CFG)

    # ====================================================
    # Analisis financiero
    # ====================================================    

    ## Flujo de caja
    df_flujo_caja = cf_table(
        ws,
        column_cf_anio = CFG["parametros_busqueda_flujo_caja"]["column_anio"],
        column_cf_equipamiento = CFG["parametros_busqueda_flujo_caja"]["column_equipamiento"],
        column_cf_tarifa = CFG["parametros_busqueda_flujo_caja"]["column_tarifa"],
        column_cf_opex = CFG["parametros_busqueda_flujo_caja"]["column_OPEX"],
        column_cf_energia = CFG["parametros_busqueda_flujo_caja"]["column_energia"],
        column_cf_ahorro = CFG["parametros_busqueda_flujo_caja"]["column_ahorro"],
        column_cf_flujo_total = CFG["parametros_busqueda_flujo_caja"]["column_flujo_total"],
        column_cf_flujo_acumulado = CFG["parametros_busqueda_flujo_caja"]["column_flujo_acumulado"],
        maximo_vector=CFG["parametros_busqueda_flujo_caja"]["maximo_vector_flujo_caja"],
        minimo_vector=CFG["parametros_busqueda_flujo_caja"]["minimo_vector_flujo_caja"],
    )

    ## Tabla de parametros
    df_finantial_params = finantial_table(
        ws,
        column_cf_parametro = CFG["parametros_busqueda_parametros_financieros"]["column_parametro"],
        column_cf_valor = CFG["parametros_busqueda_parametros_financieros"]["column_valor"],
        column_cf_unidad = CFG["parametros_busqueda_parametros_financieros"]["column_unidad"],
        maximo_vector = CFG["parametros_busqueda_parametros_financieros"]["maximo_vector_parametros_financieros"],
        minimo_vector = CFG["parametros_busqueda_parametros_financieros"]["minimo_vector_parametros_financieros"],
    )

    ## Generacion de graficas
    output_files = generar_graficas(df_flujo_caja)

    # Multiusuario: si no te pasan output, conserva el comportamiento viejo
    if output_pdf_path is None:
        output_pdf_path = root_path / "Outputs" / "reporte_final.pdf"
    else:
        output_pdf_path = Path(output_pdf_path)

    output_pdf_path = output_pdf_path.resolve()
    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)

    build_reporte_pdf_finantial(
        output_pdf_path=output_pdf_path,
        root_path=root_path,
        assets_logo=assets["logo"],
        assets_firma=assets["firma"],
        DF_CF=df_flujo_caja,
        DF_FINANTIAL=df_finantial_params,
        DF_PLOTS=list(output_files.values()),
        dict_datos=dict_datos,
    )

    return output_pdf_path


if __name__ == "__main__":
    # Útil para probar localmente el core sin API
    CFG = build_config()

    # ----------------------------------------------------
    # ROOT_PATH absoluto
    # ----------------------------------------------------
    root_cfg = CFG["data_roots"]["ROOT_PATH"]
    ROOT_PATH = Path(root_cfg).resolve()

    # ----------------------------------------------------
    # Cargar el excel principal del sistema
    # ----------------------------------------------------
    budget_cfg = CFG["data_roots"].get("Budget_File")
    if not budget_cfg:
        raise ValueError("CFG['data_roots']['Budget_File'] está vacío.")

    Budget_File = Path(budget_cfg)
    if not Budget_File.is_absolute():
        Budget_File = (ROOT_PATH / Budget_File).resolve()

    if not Budget_File.exists():
        raise FileNotFoundError(f"No se encontró el Budget: {Budget_File}")

    wb1 = load_workbook(Budget_File, data_only=True)
    ws_cotizacion = wb1["COTIZACIÓN"]

    wb1 = load_workbook(Budget_File, data_only=True)
    ws_finanzas = wb1["FLUJO DE CAJA"]

    ### Declarar datos del reporte de cotizacion
    dict_datos = {
        "cliente": ws_cotizacion[f"{CFG['datos_informe']['column_cliente']}{CFG['datos_informe']['row_cliente']}"].value,
        "ruc_dni": ws_cotizacion[f"{CFG['datos_informe']['column_RUC']}{CFG['datos_informe']['row_RUC']}"].value,
        "proyecto": ws_cotizacion[f"{CFG['datos_informe']['column_Proyecto']}{CFG['datos_informe']['row_Proyecto']}"].value,
        "fecha": CFG['datos_informe']['Fecha'],
        "lugar": ws_cotizacion[f"{CFG['datos_informe']['column_Lugar']}{CFG['datos_informe']['row_Lugar']}"].value,
        "atencion": ws_cotizacion[f"{CFG['datos_informe']['column_Atencion']}{CFG['datos_informe']['row_Atencion']}"].value
    }

    assets = {
        "logo": ROOT_PATH / "src" / "assets" / "TEC_logo.png",
        "firma": ROOT_PATH / "src" / "assets" / "Firma_jguerrero.png",
    }

    pdf_path_quote = generate_report_quote(CFG, ws_cotizacion, dict_datos, assets)
    pdf_path_finantial = generate_report_finantial(CFG, ws_finanzas, dict_datos, assets)
    print(f"PDF generado en: {pdf_path_quote}")
    print(f"PDF generado en: {pdf_path_finantial}")