from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Carga de variables de entorno
def _load_env_files() -> None:
    """Load env vars from common locations for local development."""
    current_dir = Path(__file__).resolve()
    python_server_root = current_dir.parents[2]
    server_root = current_dir.parents[3] / "server"

    load_dotenv(python_server_root / ".env", override=False)
    load_dotenv(server_root / ".env", override=False)


_load_env_files()

# obtener url de la base de datos
def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError(
            "DATABASE_URL is not configured. Set it in environment variables "
            "or in server/.env."
        )
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)
Base = declarative_base() # metadatos de la base de datos, se usa para definir modelos


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Revisar conexion con el DB
def check_database_connection() -> Dict[str, Any]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"database": "ok"}
