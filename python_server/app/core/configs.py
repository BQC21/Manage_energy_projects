from __future__ import annotations

from typing import Any, Dict
from datetime import date
import re

# ----------------------------
# Defaults (sin GUI)
# ----------------------------
DEFAULT_CFG: Dict[str, Any] = {
    "data_roots": {
        # Si lo dejas vacío, la GUI lo rellena.
        "ROOT_PATH": "",
        "Budget_File": ""
    },

    "parametros_busqueda_BUDGET": {
        # Fallback por coordenadas fijas si la detección dinámica no ubica el bloque.
        "column_precio_EQUIPOS": "G",
        "row_precio_EQUIPOS": 15,
        "column_precio_MO": "G",
        "row_precio_MO": 45,

        "minimo_vector_MO": 51,
        "maximo_vector_MO": 62,
        "minimo_vector_EQUIPOS": 19,
        "maximo_vector_EQUIPOS": 23,

        "column_equipos_desc": "E",
        "column_equipos_cant": "G",
        "column_equipos_uni": "F",
    },

    "datos_informe": {
        "vida_util_anios": 20,
        "_%perdida": 0.4,
        "plazo_entrega": 1,

        # Fallback por coordenadas fijas si la detección semántica no ubica la etiqueta.
        "column_cliente": "E",
        "row_cliente": 9,

        "column_RUC": "E",
        "row_RUC": 10,

        "column_Proyecto": "E",
        "row_Proyecto": 11,

        "column_Lugar": "G",
        "row_Lugar": 10,

        "column_Atencion": "G",
        "row_Atencion": 11,

        "Fecha": date.today().strftime("%d/%m/%Y"),
        
        "BCP_soles": "194-4373203-0-66",
        "CCI_soles": "002194 0043732030 6693",
        "BCP_dolares": "194-6917620-1-58",
        "CCI_dolares": "002194 0069176201 5895",
        "CTA_detraccion": "00 076 190305",
    },

    "parametros_busqueda_flujo_caja" : {
        # Fallback por coordenadas fijas si la detección dinámica no ubica la tabla.
        "column_anio": "H",
        "column_equipamiento": "I",
        "column_tarifa": "J",
        "column_OPEX": "K",
        "column_energia": "M",
        "column_ahorro": "L",
        "column_flujo_total": "N",
        "column_flujo_acumulado": "O",

        "maximo_vector_flujo_caja": 33,
        "minimo_vector_flujo_caja": 3,
    },

    "parametros_busqueda_parametros_financieros" : {
        # Fallback por coordenadas fijas si la detección dinámica no ubica la tabla.
        "column_parametro": "B",
        "column_valor": "C",
        "column_unidad": "D",
        
        "maximo_vector_parametros_financieros": 12,
        "minimo_vector_parametros_financieros": 2,
    },

    "excel_semantics": {
        "quote_fields": {
            "cliente": ["cliente", "razon social", "empresa"],
            "ruc_dni": ["ruc", "dni", "ruc/dni", "ruc dni"],
            "proyecto": ["proyecto", "nombre del proyecto"],
            "lugar": ["lugar", "ubicacion", "direccion", "dirección"],
            "atencion": ["atencion", "atención", "contacto", "responsable"],
        },
        "quote_table_headers": {
            "descripcion": ["descripcion", "descripción"],
            "unidad": ["unidad", "und"],
            "cantidad": ["cantidad", "cant"],
        },
        "financial_flow_headers": {
            "anio": ["año", "anio"],
            "equipamiento": ["equipamiento", "inversion", "equipos"],
            "tarifa": ["tarifa"],
            "opex": ["opex"],
            "ahorro": ["ahorro"],
            "flujo_total": ["flujo total"],
            "flujo_acumulado": ["flujo acumulado"],
        },
        "financial_param_headers": {
            "parametro": ["parametro", "parámetro"],
            "valor": ["valor"],
            "unidad": ["unidad"],
        },
    }
}

# ----------------------------
# Helpers
# ----------------------------
_COL_RE = re.compile(r"^[A-Z]{1,3}$") 

def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Merge recursivo: su posible chancada"""
    out = dict(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def normalize_cfg(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Limpia espacios y estandariza mayúsculas en columnas"""

    pb_1 = cfg.get("parametros_busqueda_BUDGET", {})
    for key in list(pb_1.keys()):
        if key.startswith("column_") and isinstance(pb_1[key], str):
            pb_1[key] = pb_1[key].strip().upper()
    cfg["parametros_busqueda_BUDGET"] = pb_1

    dr = cfg.get("data_roots", {})
    for key in ("ROOT_PATH", "Budget_File"):
        if isinstance(dr.get(key), str):
            dr[key] = dr[key].strip()
    cfg["data_roots"] = dr

    di = cfg.get("datos_informe", {})
    for key, val in list(di.items()):
        if isinstance(val, str):
            di[key] = val.strip()
    cfg["datos_informe"] = di

    semantics = cfg.get("excel_semantics", {})
    for section_name, section_values in list(semantics.items()):
        if not isinstance(section_values, dict):
            continue
        normalized_section: Dict[str, Any] = {}
        for key, aliases in section_values.items():
            if isinstance(aliases, list):
                normalized_section[key] = [
                    alias.strip() for alias in aliases if isinstance(alias, str) and alias.strip()
                ]
            else:
                normalized_section[key] = aliases
        semantics[section_name] = normalized_section
    cfg["excel_semantics"] = semantics

    return cfg


def validate_cfg(cfg: Dict[str, Any]) -> None:
    """Valida lo mínimo para evitar errores mas adelante"""

    dr = cfg.get("data_roots", {})
    if not dr.get("ROOT_PATH"):
        raise ValueError("CFG.data_roots.ROOT_PATH está vacío.")
    if not dr.get("Budget_File"):
        raise ValueError("CFG.data_roots.Budget_File está vacío (sube el Excel desde la GUI).")
            
    pb_1 = cfg.get("parametros_busqueda_BUDGET", {})
    # Validación simple de columnas
    for k, v in pb_1.items():
        if k.startswith("column_"):
            if not isinstance(v, str) or not _COL_RE.match(v.strip().upper()):
                raise ValueError(f"Columna inválida en parametros_busqueda_BUDGET.{k}: {v!r}")

    # Validación simple de rangos (ejemplo)
    def _check_range(section: Dict[str, Any], min_k: str, max_k: str):
        a = int(section[min_k])
        b = int(section[max_k])
        if a > b:
            raise ValueError(f"Rango inválido: {min_k} ({a}) > {max_k} ({b})")

    _check_range(pb_1, "minimo_vector_EQUIPOS", "maximo_vector_EQUIPOS")
    _check_range(pb_1, "minimo_vector_MO", "maximo_vector_MO")

    pb_fc = cfg.get("parametros_busqueda_flujo_caja", {})
    _check_range(pb_fc, "minimo_vector_flujo_caja", "maximo_vector_flujo_caja")

    pb_pf = cfg.get("parametros_busqueda_parametros_financieros", {})
    _check_range(pb_pf, "minimo_vector_parametros_financieros", "maximo_vector_parametros_financieros")

    semantics = cfg.get("excel_semantics", {})
    for section_name, section_values in semantics.items():
        if not isinstance(section_values, dict):
            raise ValueError(f"CFG.excel_semantics.{section_name} debe ser un dict.")
        for key, aliases in section_values.items():
            if not isinstance(aliases, list) or not aliases:
                raise ValueError(f"CFG.excel_semantics.{section_name}.{key} debe ser una lista no vacía.")
            if not all(isinstance(alias, str) and alias.strip() for alias in aliases):
                raise ValueError(
                    f"CFG.excel_semantics.{section_name}.{key} solo debe contener strings no vacíos."
                )


def build_config(overrides: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Construye CFG sin depender de GUI.
    - Si overrides=None: te devuelve defaults.
    - Si overrides existe: lo mergea encima.
    """
    cfg = deep_merge(DEFAULT_CFG, overrides or {})
    cfg = normalize_cfg(cfg)
    validate_cfg(cfg)
    return cfg
