import re
from typing import Any, Dict, Optional, Sequence

import pandas as pd

from .configs import *
from .excel_local import extract_table_rows, extract_table_with_fallback, resolve_named_values

# normalizar cadenas para comparar
def normalizar(s):
    return " ".join(s.strip().lower().split())

# extraer el entero de una celda hibrida (numero y unidad)
def extraer_entero(celda):
    if isinstance(celda, str):
        match = re.search(r"[\d.]+", celda)
        return float(match.group()) if match else 0.0
    elif isinstance(celda, (int, float)):
        return float(celda)
    else:
        return 0.0


def _safe_div(numerator, denominator):
    num = extraer_entero(numerator)
    den = extraer_entero(denominator)
    if den == 0:
        return 0.0
    return num / den


def _coerce_numeric(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()
    if not text or not any(ch.isdigit() for ch in text):
        return None

    cleaned = re.sub(r"[^0-9,.\-]", "", text)
    if not cleaned:
        return None

    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")

    try:
        return float(cleaned)
    except ValueError:
        return None


def _sanitize_cash_flow_df(df_flujo: pd.DataFrame) -> pd.DataFrame:
    if df_flujo.empty:
        return df_flujo

    df_clean = df_flujo.copy()
    numeric_columns = [
        "Año",
        "Equipamiento",
        "Tarifa",
        "OPEX",
        "Energía",
        "Ahorro",
        "Flujo Total",
        "Flujo Acumulado",
    ]
    value_columns = [
        "Equipamiento",
        "Tarifa",
        "OPEX",
        "Energía",
        "Ahorro",
        "Flujo Total",
        "Flujo Acumulado",
    ]

    for column in numeric_columns:
        if column in df_clean.columns:
            df_clean[column] = df_clean[column].apply(_coerce_numeric)

    # Descarta filas-resumen como "Subtotales" y otras filas no numéricas.
    df_clean = df_clean[df_clean["Año"].notna()].copy()
    df_clean = df_clean[
        df_clean[["Equipamiento", "Ahorro", "OPEX", "Flujo Total", "Flujo Acumulado"]]
        .notna()
        .any(axis=1)
    ].copy()

    for column in value_columns:
        if column in df_clean.columns:
            df_clean[column] = df_clean[column].fillna(0.0)

    return df_clean.reset_index(drop=True)

def construir_gastos(ws,
        minimo_vector_EQUIPOS,
        maximo_vector_EQUIPOS,
        minimo_vector_MO,
        maximo_vector_MO,
        column_equipos_desc,
        column_equipos_cant,
        column_equipos_uni,
        column_precio_EQUIPOS,
        row_precio_EQUIPOS,
        column_precio_MO,
        row_precio_MO,
        dynamic_layout: Optional[Dict[str, Any]] = None):

    table_aliases: Dict[str, Sequence[str]] = {
        "descripcion": ("descripcion", "descripción"),
        "unidad": ("unidad", "und"),
        "cantidad": ("cantidad", "cant"),
    }
    price_aliases: Dict[str, Sequence[str]] = {
        "precio_equipos": ("equipos principales", "equipamiento", "equipos"),
        "precio_mo": ("mano de obra", "instalacion", "instalación", "puesta en marcha"),
    }

    fallback_price_values: Dict[str, Any] = {
        "precio_equipos": ws[f"{column_precio_EQUIPOS}{row_precio_EQUIPOS}"].value,
        "precio_mo": ws[f"{column_precio_MO}{row_precio_MO}"].value,
    }
    resolved_prices = resolve_named_values(
        ws,
        price_aliases,
        fallback=fallback_price_values,
    )

    df_MO = pd.DataFrame(columns=['Descripción'])
    df_equipos = pd.DataFrame(columns=['Descripción', 'Unidad', 'Cantidad'])
    df_principal = pd.DataFrame(columns=['Descripción', 'Precio'])

    detected_quote_table = (dynamic_layout or {}).get("quote_table")
    if detected_quote_table is not None:
        dynamic_rows = extract_table_rows(ws, detected_quote_table)
    else:
        dynamic_rows = extract_table_with_fallback(ws, table_aliases)
    if dynamic_rows:
        equipos_rows = []
        mo_rows = []
        for row in dynamic_rows:
            desc = row.get("descripcion")
            unidad = row.get("unidad")
            cantidad = row.get("cantidad")
            if not desc:
                continue

            normalized_unidad = normalizar(str(unidad)) if unidad is not None else ""
            has_equipment_shape = cantidad not in (None, "") or normalized_unidad != ""
            if has_equipment_shape:
                equipos_rows.append(
                    {
                        "Descripción": desc,
                        "Unidad": unidad,
                        "Cantidad": cantidad,
                    }
                )
            else:
                mo_rows.append({"Descripción": desc})

        if equipos_rows:
            df_equipos = pd.DataFrame(equipos_rows, columns=['Descripción', 'Unidad', 'Cantidad'])
        if mo_rows:
            df_MO = pd.DataFrame(mo_rows, columns=['Descripción'])

    ## Efecto del callback: si no se detectan filas, se intenta extraer de forma directa (asumiendo formato tradicional)
    if df_MO.empty:
        for fila in range(minimo_vector_MO, maximo_vector_MO + 1):
            desc = ws[f"{column_equipos_desc}{fila}"].value
            if desc:
                new_row = pd.DataFrame([{'Descripción': desc}])
                df_MO = pd.concat([df_MO, new_row], ignore_index=False)

    if df_equipos.empty:
        for fila in range(minimo_vector_EQUIPOS, maximo_vector_EQUIPOS + 1):
            desc = ws[f"{column_equipos_desc}{fila}"].value
            if desc:
                cant = ws[f"{column_equipos_cant}{fila}"].value
                uni = ws[f"{column_equipos_uni}{fila}"].value
                new_row = pd.DataFrame([{'Descripción': desc, 'Unidad': uni, 'Cantidad': cant}])
                df_equipos = pd.concat([df_equipos, new_row], ignore_index=False)

    precio_equipos = extraer_entero(resolved_prices.get("precio_equipos"))
    precio_mo = extraer_entero(resolved_prices.get("precio_mo"))

    new_row = pd.DataFrame([{'Descripción': 'Equipos Principales', 'Precio': precio_equipos}])
    df_principal = pd.concat([df_principal, new_row], ignore_index=False)

    new_row = pd.DataFrame([{'Descripción': 'Mano de obra', 'Precio': precio_mo}])
    df_principal = pd.concat([df_principal, new_row], ignore_index=False)

    return df_MO, df_equipos, df_principal

def total_cot(df_principal):
    
    # Totales correctos (considerando que los precios están sin IGV)
    def get_precio(df, descripcion):
        mask = df["Descripción"] == descripcion
        if mask.any():
            return df.loc[mask, "Precio"].iloc[0]
        else:
            print(f"Warning: '{descripcion}' not found in df_principal. Using 0.0")
            return 0.0
    
    DF_EP_total_sin_igv = get_precio(df_principal, "Equipos Principales")
    DF_MO_total_sin_igv = get_precio(df_principal, "Mano de obra")

    total_sin_igv = DF_EP_total_sin_igv + DF_MO_total_sin_igv
    igv_monto = total_sin_igv * 0.18  # IGV al 18%
    total_con_igv = total_sin_igv + igv_monto

    # Retorna también el resumen (te sirve para PDF)
    resumen = {
        "Subtotal": f"$ {total_sin_igv:,.2f}" ,
        "IGV": f"$ {igv_monto:,.2f}",
        "Total": f"$ {total_con_igv:,.2f}",
    }

    return resumen


def total_cot_value(resumen):
    total_raw = resumen.get("Total", "")
    if not isinstance(total_raw, str):
        return float(total_raw) if total_raw is not None else 0.0
    cleaned = re.sub(r"[^0-9.]", "", total_raw)
    return float(cleaned) if cleaned else 0.0


def count_nro_panels(df_equipos):
    if df_equipos.empty:
        return 0

    panel_rows = df_equipos[
        df_equipos["Descripción"].astype(str).str.contains("panel solar|modulo|módulo", case=False, na=False)
    ]
    if panel_rows.empty:
        return 0

    total = panel_rows["Cantidad"].apply(extraer_entero).sum()
    # print("Total paneles solares:", total)
    return int(round(total))

def cf_table(
        ws,
        column_cf_anio,
        column_cf_equipamiento, 
        column_cf_tarifa,
        column_cf_opex, 
        column_cf_energia,
        column_cf_ahorro,
        column_cf_flujo_total,
        column_cf_flujo_acumulado,
        maximo_vector,
        minimo_vector,
        dynamic_layout: Optional[Dict[str, Any]] = None,
):
    """
    Construye el DataFrame del flujo de caja desde la hoja "FLUJO DE CAJA" del Excel.
    Utiliza detección dinámica con fallback a columnas específicas.
    """
    params_aliases: Dict[str, Sequence[str]] = {
        "anio": ("año", "anio"),
        "equipamiento": ("equipamiento", "equipos"),
        "tarifa": ("tarifa", "tasa"),
        "opex": ("opex", "operación", "operativo"),
        "energia": ("energia", "energía"),
        "ahorro": ("ahorro", "savings"),
        "flujo_total": ("flujo_total", "flujo", "cash_flow"),
        "flujo_acumulado": ("flujo_acumulado", "acumulado", "flujo_acumulativo"),
    }

    fallback_params_values: Dict[str, Any] = {
        "anio": ws[f"{column_cf_anio}{minimo_vector}"].value,
        "equipamiento": ws[f"{column_cf_equipamiento}{minimo_vector}"].value,
        "tarifa": ws[f"{column_cf_tarifa}{minimo_vector}"].value,
        "opex": ws[f"{column_cf_opex}{minimo_vector}"].value,
        "energia": ws[f"{column_cf_energia}{minimo_vector}"].value,
        "ahorro": ws[f"{column_cf_ahorro}{minimo_vector}"].value,
        "flujo_total": ws[f"{column_cf_flujo_total}{minimo_vector}"].value,
        "flujo_acumulado": ws[f"{column_cf_flujo_acumulado}{minimo_vector}"].value,
    }

    df_flujo = pd.DataFrame(columns=['Año', 'Equipamiento', 'Tarifa', 'OPEX', 
                                    'Energía', 'Ahorro', 'Flujo Total', 'Flujo Acumulado'])
    
    detected_flow_table = (dynamic_layout or {}).get("financial_flow_table")
    if detected_flow_table is not None:
        dynamic_rows = extract_table_rows(ws, detected_flow_table)
    else:
        dynamic_rows = extract_table_with_fallback(ws, params_aliases)
    if dynamic_rows:
        params_rows = []
        for row in dynamic_rows:
            anio = row.get("anio")
            equipamiento = row.get("equipamiento")
            tarifa = row.get("tarifa")
            opex = row.get("opex")
            energia = row.get("energia")
            ahorro = row.get("ahorro")
            flujo_total = row.get("flujo_total")
            flujo_acumulado = row.get("flujo_acumulado")
            
            if any(x is not None for x in [anio, equipamiento, tarifa, opex, energia, ahorro, flujo_total, flujo_acumulado]):
                params_rows.append({
                    'Año': anio,
                    'Equipamiento': equipamiento,
                    'Tarifa': tarifa,
                    'OPEX': opex,
                    'Energía': energia,
                    'Ahorro': ahorro,
                    'Flujo Total': flujo_total,
                    'Flujo Acumulado': flujo_acumulado
                })
        
        if params_rows:
            df_flujo = pd.DataFrame(params_rows)
            return _sanitize_cash_flow_df(df_flujo)

    ## Fallback: Si no se detectan filas dinámicamente, extraer de forma directa (formato tradicional)
    for fila in range(minimo_vector, maximo_vector + 1):
        anio = ws[f"{column_cf_anio}{fila}"].value
        equipamiento = ws[f"{column_cf_equipamiento}{fila}"].value
        tarifa = ws[f"{column_cf_tarifa}{fila}"].value
        opex = ws[f"{column_cf_opex}{fila}"].value
        energia = ws[f"{column_cf_energia}{fila}"].value
        ahorro = ws[f"{column_cf_ahorro}{fila}"].value
        flujo_total = ws[f"{column_cf_flujo_total}{fila}"].value
        flujo_acumulado = ws[f"{column_cf_flujo_acumulado}{fila}"].value

        if any(x is not None for x in [anio, equipamiento, tarifa, opex, energia, ahorro, flujo_total, flujo_acumulado]):
            new_row = pd.DataFrame([{
                'Año': anio,
                'Equipamiento': equipamiento,
                'Tarifa': tarifa,
                'OPEX': opex,
                'Energía': energia,
                'Ahorro': ahorro,
                'Flujo Total': flujo_total,
                'Flujo Acumulado': flujo_acumulado
            }])
            df_flujo = pd.concat([df_flujo, new_row], ignore_index=True)

    return _sanitize_cash_flow_df(df_flujo)

def finantial_table(
    ws,
    column_cf_parametro,
    column_cf_valor, 
    column_cf_unidad,
    maximo_vector,
    minimo_vector,
    dynamic_layout: Optional[Dict[str, Any]] = None,
):
    """
    Construye el DataFrame asociada a la tabla de parametros financieros
    desde la hoja "FLUJO DE CAJA" del Excel.
    Utiliza detección dinámica con fallback a columnas específicas.
    """
    params_aliases: Dict[str, Sequence[str]] = {
        "parametro": ("parametro", "parámetro", "item"),
        "valor": ("valor", "value"),
        "unidad": ("unidad", "und", "unit"),
    }

    fallback_params_values: Dict[str, Any] = {
        "parametro": ws[f"{column_cf_parametro}{minimo_vector}"].value,
        "valor": ws[f"{column_cf_valor}{minimo_vector}"].value,
        "unidad": ws[f"{column_cf_unidad}{minimo_vector}"].value,
    }

    df_finantial_params = pd.DataFrame(columns=['Parámetro', 'Valor', 'Unidad'])
    
    detected_params_table = (dynamic_layout or {}).get("financial_params_table")
    if detected_params_table is not None:
        dynamic_rows = extract_table_rows(ws, detected_params_table)
    else:
        dynamic_rows = extract_table_with_fallback(ws, params_aliases)
    if dynamic_rows:
        params_rows = []
        for row in dynamic_rows:
            parametro = row.get("parametro")
            valor = row.get("valor")
            unidad = row.get("unidad")
            
            if any(x is not None for x in [parametro, valor, unidad]):
                params_rows.append({
                    'Parámetro': parametro,
                    'Valor': valor,
                    'Unidad': unidad
                })
        
        if params_rows:
            df_finantial_params = pd.DataFrame(params_rows)
            return df_finantial_params

    ## Fallback: Si no se detectan filas dinámicamente, extraer de forma directa (formato tradicional)
    for fila in range(minimo_vector, maximo_vector + 1):

        parametro = ws[f"{column_cf_parametro}{fila}"].value
        valor = ws[f"{column_cf_valor}{fila}"].value
        unidad = ws[f"{column_cf_unidad}{fila}"].value

        if any(x is not None for x in [parametro, valor, unidad]):
            new_row = pd.DataFrame([{
                'Parámetro': parametro,
                'Valor': valor,
                'Unidad': unidad
            }])
            df_finantial_params = pd.concat([df_finantial_params, new_row], ignore_index=True)

    return df_finantial_params      

def generar_graficas(df_flujo_caja):
    """
    Genera las gráficas a partir del DataFrame del flujo de caja.
        - Gráfica de barras del Flujo Total por Año.
        - Gráfica de líneas del Flujo Acumulado por Año.
    """

    import matplotlib.pyplot as plt
    import seaborn as sns

    df_plot = df_flujo_caja.copy()
    df_plot = _sanitize_cash_flow_df(df_plot)

    if df_plot.empty:
        return {}

    output_files = {}

    # 1) Barras: Flujo Total
    plt.figure(figsize=(8, 6))
    sns.barplot(x=df_plot["Año"], y=df_plot["Equipamiento"], data=df_plot, color="#4C72B0", legend=True)
    sns.barplot(x=df_plot["Año"], y=df_plot["Ahorro"], data=df_plot, color="#7C877F", legend=True)
    sns.barplot(x=df_plot["Año"], y=df_plot["OPEX"], data=df_plot, color="#ED9325", legend=True)
    plt.title("Componentes del flujo (ahorro)")
    plt.xlabel("Año")
    plt.ylabel("Componentes del flujo")
    plt.xticks(rotation=45)
    plt.legend(["Equipamiento", "Ahorro", "OPEX"])
    plt.tight_layout()
    output_files["flujo_total"] = "flujo_total_por_anio.png"
    plt.savefig(output_files["flujo_total"])
    plt.close()

    # 2) Línea: Flujo Acumulado
    plt.figure(figsize=(8, 6))
    sns.barplot(x=df_plot["Año"], y=df_plot["Flujo Total"], data=df_plot, color="#4C72B0", legend=True)
    sns.lineplot(x="Año", y="Flujo Acumulado", data=df_plot, color="#ED9325", legend=True)
    plt.title("Flujo Acumulado por Año")
    plt.xlabel("Año")
    plt.ylabel("Flujo Acumulado")
    plt.xticks(rotation=45)
    plt.legend(["Flujo Total", "Flujo Acumulado"])
    plt.tight_layout()
    output_files["flujo_acumulado"] = "flujo_acumulado_por_anio.png"
    plt.savefig(output_files["flujo_acumulado"])
    plt.close()

    return output_files
