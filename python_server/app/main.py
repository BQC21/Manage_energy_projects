from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as reports_router
from .db.session import check_database_connection

def create_app() -> FastAPI:
    app = FastAPI(
        title="Cotizador API",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", 
                    "http://localhost:5173"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(reports_router, prefix="/api")

    @app.on_event("startup")
    def startup_event() -> None:
        check_database_connection()

    # Simple health check endpoint
    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/health/db")
    def health_db():
        return check_database_connection()

    return app

app = create_app()
