# backend/app/api/routes.py
from __future__ import annotations

import json
import os
import uuid
import tempfile
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, File
from fastapi import Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from openpyxl import load_workbook

from ..core.configs import build_config
from ..core.cotizaciones import generate_report_quote, generate_report_finantial


router = APIRouter(tags=["reports"])


def _project_root() -> Path:
    """
    Calcula el ROOT_PATH para tu core.
    Ajusta si mueves carpetas. Con esta estructura:
    backend/app/api/routes.py -> root = repo/
    """
    # routes.py -> api/ -> app/ -> backend/ -> repo/
    return Path(__file__).resolve().parents[3]


def _build_report_context(cfg: Dict[str, Any]) -> Dict[str, Any]:
    root_path = Path(cfg["data_roots"]["ROOT_PATH"]).resolve()
    budget_file = Path(cfg["data_roots"]["Budget_File"]).resolve()

    try:
        workbook = load_workbook(budget_file, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo abrir el Excel cargado: {exc}") from exc

    required_sheets = {"COTIZACIÓN", "FLUJO DE CAJA"}
    missing_sheets = sorted(required_sheets.difference(workbook.sheetnames))
    if missing_sheets:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan hojas requeridas en el Excel: {', '.join(missing_sheets)}",
        )

    ws_cotizacion = workbook["COTIZACIÓN"]
    ws_finanzas = workbook["FLUJO DE CAJA"]
    datos_cfg = cfg["datos_informe"]

    dict_datos = {
        "cliente": ws_cotizacion[f"{datos_cfg['column_cliente']}{datos_cfg['row_cliente']}"].value,
        "ruc_dni": ws_cotizacion[f"{datos_cfg['column_RUC']}{datos_cfg['row_RUC']}"].value,
        "proyecto": ws_cotizacion[f"{datos_cfg['column_Proyecto']}{datos_cfg['row_Proyecto']}"].value,
        "fecha": datos_cfg["Fecha"],
        "lugar": ws_cotizacion[f"{datos_cfg['column_Lugar']}{datos_cfg['row_Lugar']}"].value,
        "atencion": ws_cotizacion[f"{datos_cfg['column_Atencion']}{datos_cfg['row_Atencion']}"].value,
    }

    assets = {
        "logo": root_path / "client" / "src" / "assets" / "TEC_logo.png",
        "firma": root_path / "client" / "src" / "assets" / "Firma_jguerrero.png",
    }

    return {
        "ws_cotizacion": ws_cotizacion,
        "ws_finanzas": ws_finanzas,
        "dict_datos": dict_datos,
        "assets": assets,
    }


@router.post("/reports/quote")
async def create_quote_report(
    background_tasks: BackgroundTasks,
    excel_file: UploadFile = File(...),
    overrides_json: Optional[str] = Form(None)
):
    """
    Recibe:
    - excel_file (xlsx) via multipart/form-data
    - overrides_json (opcional) via form field: string JSON

    Devuelve:
    - PDF generado (FileResponse)
    """

    # --- Validaciones básicas del upload ---
    filename = excel_file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx/.xlsm/.xls")

    # Root path del proyecto 
    ROOT_PATH = _project_root()

    ## --- Parse overrides JSON si viene ---
    overrides: Dict[str, Any] = {}
    if overrides_json:
        try:
            overrides = json.loads(overrides_json)
            if not isinstance(overrides, dict):
                raise ValueError("overrides_json debe ser un JSON objeto (dict).")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"overrides_json inválido: {e}")

    td = tempfile.mkdtemp(prefix="cotizador_")   # <-- NO context manager
    td_path = Path(td)
    background_tasks.add_task(shutil.rmtree, td, ignore_errors=True)  # <-- se borra al final

    tmp_excel_path = td_path / filename
    contents = await excel_file.read() # espera haasta que sube el EXCEL sin pausar toda la app
    tmp_excel_path.write_bytes(contents)

    merged_overrides: Dict[str, Any] = {
        "data_roots": {
            "ROOT_PATH": str(ROOT_PATH),
            "Budget_File": str(tmp_excel_path),
        }
    }

    if overrides:
        merged_overrides.update({k: v for k, v in overrides.items() if k != "data_roots"})
        if "data_roots" in overrides and isinstance(overrides["data_roots"], dict):
            merged_overrides["data_roots"].update(overrides["data_roots"])
            merged_overrides["data_roots"]["ROOT_PATH"] = str(ROOT_PATH)
            merged_overrides["data_roots"]["Budget_File"] = str(tmp_excel_path)

    CFG = build_config(merged_overrides)
    report_context = _build_report_context(CFG)

    request_id = uuid.uuid4().hex
    out_pdf = td_path / f"reporte_{request_id}.pdf"
    pdf_path = generate_report_quote(
        CFG,
        ws=report_context["ws_cotizacion"],
        dict_datos=report_context["dict_datos"],
        assets=report_context["assets"],
        output_pdf_path=out_pdf,
    )

    if not pdf_path.exists():
        raise HTTPException(status_code=500, detail=f"No se generó el PDF esperado: {pdf_path}")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="reporte_final.pdf",
        background=background_tasks,
    )

@router.post("/reports/finantial")
async def create_finantial_report(
    background_tasks: BackgroundTasks,
    excel_file: UploadFile = File(...),
    overrides_json: Optional[str] = Form(None)
):
    """
    Recibe:
    - excel_file (xlsx) via multipart/form-data
    - overrides_json (opcional) via form field: string JSON

    Devuelve:
    - PDF generado (FileResponse)
    """

    # --- Validaciones básicas del upload ---
    filename = excel_file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx/.xlsm/.xls")

    # Root path del proyecto 
    ROOT_PATH = _project_root()

    ## --- Parse overrides JSON si viene ---
    overrides: Dict[str, Any] = {}
    if overrides_json:
        try:
            overrides = json.loads(overrides_json)
            if not isinstance(overrides, dict):
                raise ValueError("overrides_json debe ser un JSON objeto (dict).")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"overrides_json inválido: {e}")

    td = tempfile.mkdtemp(prefix="cotizador_")   # <-- NO context manager
    td_path = Path(td)
    background_tasks.add_task(shutil.rmtree, td, ignore_errors=True)  # <-- se borra al final

    tmp_excel_path = td_path / filename
    contents = await excel_file.read() # espera haasta que sube el EXCEL sin pausar toda la app
    tmp_excel_path.write_bytes(contents)

    merged_overrides: Dict[str, Any] = {
        "data_roots": {
            "ROOT_PATH": str(ROOT_PATH),
            "Budget_File": str(tmp_excel_path),
        }
    }

    if overrides:
        merged_overrides.update({k: v for k, v in overrides.items() if k != "data_roots"})
        if "data_roots" in overrides and isinstance(overrides["data_roots"], dict):
            merged_overrides["data_roots"].update(overrides["data_roots"])
            merged_overrides["data_roots"]["ROOT_PATH"] = str(ROOT_PATH)
            merged_overrides["data_roots"]["Budget_File"] = str(tmp_excel_path)

    CFG = build_config(merged_overrides)
    report_context = _build_report_context(CFG)

    request_id = uuid.uuid4().hex
    out_pdf = td_path / f"reporte_{request_id}.pdf"
    pdf_path = generate_report_finantial(
        CFG,
        ws=report_context["ws_finanzas"],
        dict_datos=report_context["dict_datos"],
        assets=report_context["assets"],
        output_pdf_path=out_pdf,
    )

    if not pdf_path.exists():
        raise HTTPException(status_code=500, detail=f"No se generó el PDF esperado: {pdf_path}")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="reporte_finantial.pdf",
        background=background_tasks,
    )