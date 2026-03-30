# backend/app/api/routes.py
from __future__ import annotations

import json
import uuid
import tempfile
import shutil
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, File
from fastapi import Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from openpyxl import load_workbook
from sqlalchemy import select

from ..core.configs import build_config
from ..core.cotizaciones import generate_report, compute_finantial_metrics, compute_quote_metrics
from ..db.models import Project
from ..db.session import SessionLocal


router = APIRouter(tags=["reports"])
ReportType = Literal["quote", "finantial"]


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


def _detect_report_type(path: str) -> ReportType:
    if path.endswith("/reports/quote"):
        return "quote"
    if path.endswith("/reports/finantial"):
        return "finantial"
    raise HTTPException(status_code=404, detail="Ruta de reporte no soportada")


def _validate_excel_filename(filename: str) -> None:
    if not filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx/.xlsm/.xls")


def _parse_overrides(report_type: ReportType, overrides_json: Optional[str]) -> Dict[str, Any]:
    if report_type != "finantial" or not overrides_json:
        return {}

    try:
        overrides = json.loads(overrides_json)
        if not isinstance(overrides, dict):
            raise ValueError("overrides_json debe ser un JSON objeto (dict).")
        return overrides
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"overrides_json inválido: {exc}") from exc


def _save_uploaded_excel(background_tasks: BackgroundTasks, filename: str) -> tuple[Path, Path]:
    temp_dir = tempfile.mkdtemp(prefix="cotizador_")
    temp_dir_path = Path(temp_dir)
    background_tasks.add_task(shutil.rmtree, temp_dir, ignore_errors=True)

    tmp_excel_path = temp_dir_path / filename
    return temp_dir_path, tmp_excel_path


def _build_merged_overrides(root_path: Path, excel_path: Path, overrides: Dict[str, Any]) -> Dict[str, Any]:
    merged_overrides: Dict[str, Any] = {
        "data_roots": {
            "ROOT_PATH": str(root_path),
            "Budget_File": str(excel_path),
        }
    }

    if overrides:
        merged_overrides.update({k: v for k, v in overrides.items() if k != "data_roots"})
        if "data_roots" in overrides and isinstance(overrides["data_roots"], dict):
            merged_overrides["data_roots"].update(overrides["data_roots"])
            merged_overrides["data_roots"]["ROOT_PATH"] = str(root_path)
            merged_overrides["data_roots"]["Budget_File"] = str(excel_path)

    return merged_overrides


def _build_response_filename(report_type: ReportType) -> str:
    if report_type == "quote":
        return "reporte_final.pdf"
    return "reporte_finantial.pdf"


@router.post("/reports/process-project")
async def process_project(
    background_tasks: BackgroundTasks,
    project_id: int = Form(...),
    excel_file: UploadFile = File(...),
    overrides_json: Optional[str] = Form(None),
):
    filename = excel_file.filename or ""
    _validate_excel_filename(filename)
    root_path = _project_root()

    overrides: Dict[str, Any] = {}
    if overrides_json:
        try:
            overrides = json.loads(overrides_json)
            if not isinstance(overrides, dict):
                raise ValueError("overrides_json debe ser un JSON objeto (dict).")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"overrides_json inválido: {exc}") from exc

    temp_dir_path, tmp_excel_path = _save_uploaded_excel(background_tasks, filename)
    contents = await excel_file.read()
    tmp_excel_path.write_bytes(contents)

    merged_overrides = _build_merged_overrides(root_path, tmp_excel_path, overrides)
    cfg = build_config(merged_overrides)
    report_context = _build_report_context(cfg)

    request_id = uuid.uuid4().hex
    quote_pdf = temp_dir_path / f"quote_{request_id}.pdf"
    finantial_pdf = temp_dir_path / f"finantial_{request_id}.pdf"

    quote_pdf_path = generate_report(
        "quote",
        cfg,
        ws=report_context["ws_cotizacion"],
        dict_datos=report_context["dict_datos"],
        assets=report_context["assets"],
        output_pdf_path=quote_pdf,
    )
    finantial_pdf_path = generate_report(
        "finantial",
        cfg,
        ws=report_context["ws_finanzas"],
        dict_datos=report_context["dict_datos"],
        assets=report_context["assets"],
        output_pdf_path=finantial_pdf,
    )

    quote_metrics = compute_quote_metrics(cfg, report_context["ws_cotizacion"])
    finantial_metrics = compute_finantial_metrics(cfg, report_context["ws_finanzas"])
    if not quote_pdf_path.exists() or not finantial_pdf_path.exists():
        raise HTTPException(status_code=500, detail="No se generaron los PDFs esperados.")

    db = SessionLocal()
    try:
        project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        project.project = str(report_context["dict_datos"]["cliente"])
        project.excel_file_path = str(tmp_excel_path)
        project.pdf_quote = str(quote_pdf_path)
        project.pdf_finantial = str(finantial_pdf_path)
        project.time_retorn = int(finantial_metrics["time_retorn"])
        project.nro_panels = int(quote_metrics["nro_panels"])
        project.price = float(quote_metrics["price"])
        db.commit()
    finally:
        db.close()

    return {
        "ok": True,
        "project_id": project_id,
        "excel_file": str(tmp_excel_path),
        "pdf_quote": str(quote_pdf_path),
        "pdf_finantial": str(finantial_pdf_path),
        "time_retorn": int(finantial_metrics["time_retorn"]),
        "nro_panels": int(quote_metrics["nro_panels"]),
        "price": float(quote_metrics["price"]),
    }


@router.post("/reports/quote")
@router.post("/reports/finantial")
async def create_report(
    request: Request,
    background_tasks: BackgroundTasks,
    excel_file: UploadFile = File(...),
    overrides_json: Optional[str] = Form(None),
):
    """
    Endpoint unificado para:
    - /reports/quote
    - /reports/finantial

    Recibe:
    - excel_file (xlsx) via multipart/form-data
    - overrides_json (opcional) via form field: string JSON (para finantial)

    Devuelve:
    - PDF generado (FileResponse)
    """

    report_type = _detect_report_type(request.url.path)

    filename = excel_file.filename or ""
    _validate_excel_filename(filename)

    root_path = _project_root()
    overrides = _parse_overrides(report_type, overrides_json)

    temp_dir_path, tmp_excel_path = _save_uploaded_excel(background_tasks, filename)

    contents = await excel_file.read()
    tmp_excel_path.write_bytes(contents)

    merged_overrides = _build_merged_overrides(root_path, tmp_excel_path, overrides)
    cfg = build_config(merged_overrides)
    report_context = _build_report_context(cfg)

    request_id = uuid.uuid4().hex
    out_pdf = temp_dir_path / f"reporte_{request_id}.pdf"

    if report_type == "quote":
        pdf_path = generate_report(
            "quote",
            cfg,
            ws=report_context["ws_cotizacion"],
            dict_datos=report_context["dict_datos"],
            assets=report_context["assets"],
            output_pdf_path=out_pdf,
        )
    else:
        pdf_path = generate_report(
            "finantial",
            cfg,
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
        filename=_build_response_filename(report_type),
        background=background_tasks,
    )
