import re
import pandas as pd

from .configs import *

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
        row_precio_MO,):
    
    df_MO = pd.DataFrame(columns=['Descripción'])
    df_equipos = pd.DataFrame(columns=['Descripción', 'Unidad', 'Cantidad'])
    df_principal = pd.DataFrame(columns=['Descripción', 'Precio'])
    
    precio = 0.0

    # construccion de df_MO desde Budget
    for fila in range(minimo_vector_MO, maximo_vector_MO + 1):
        desc = ws[f"{column_equipos_desc}{fila}"].value
        if desc:
            new_row = pd.DataFrame([{'Descripción': desc}])
            df_MO = pd.concat([df_MO, new_row], ignore_index=False)

    # construccion de df_equipos desde Budget
    for fila in range(minimo_vector_EQUIPOS, maximo_vector_EQUIPOS + 1):
        desc = ws[f"{column_equipos_desc}{fila}"].value
        if desc:
            cant = ws[f"{column_equipos_cant}{fila}"].value
            uni = ws[f"{column_equipos_uni}{fila}"].value
            new_row = pd.DataFrame([{'Descripción': desc, 'Unidad': uni, 'Cantidad': cant}])
            df_equipos = pd.concat([df_equipos, new_row], ignore_index=False)

    # construccion de df_principal desde Budget
    row_precio_EQUIPOS_val = ws[f"{column_precio_EQUIPOS}{row_precio_EQUIPOS}"].value
    precio = extraer_entero(row_precio_EQUIPOS_val) if row_precio_EQUIPOS_val else 0.0
    new_row = pd.DataFrame([{'Descripción': 'Equipos Principales', 'Precio': precio}])
    df_principal = pd.concat([df_principal, new_row], ignore_index=False)

    row_precio_MO_val = ws[f"{column_precio_MO}{row_precio_MO}"].value
    precio = extraer_entero(row_precio_MO_val) if row_precio_MO_val else 0.0
    new_row = pd.DataFrame([{'Descripción': 'Mano de obra', 'Precio': precio}])
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
        minimo_vector
):
    """
    Construye el DataFrame del flujo de caja desde la hoja "FLUJO DE CAJA" del Excel.
    """
    df_flujo = pd.DataFrame(columns=['Año', 'Equipamiento', 'Tarifa', 'OPEX', 
                                    'Energía', 'Ahorro', 'Flujo Total', 'Flujo Acumulado'])
    
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

    return df_flujo      

def finantial_table(
    ws,
    column_cf_parametro,
    column_cf_valor, 
    column_cf_unidad,
    maximo_vector,
    minimo_vector
):
    """
    Construye el DataFrame asociada a la tabla de parametros financieros
    desde la hoja "FLUJO DE CAJA" del Excel.
    """

    df_finantial_params = pd.DataFrame(columns=['Parámetro', 'Valor', 'Unidad'])
    
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