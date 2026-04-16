"""FastAPI 主入口"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core import get_settings, init_logging, logger
from app.models import AppError, HealthResponse
from app.exceptions import AppException


_start_time: float = time.time()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=settings.app_description,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=_lifespan,
    )

    # ==================== 异常处理器 ====================

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.error(f"AppException: {exc.code} - {exc.message}", extra={"detail": exc.detail})
        return JSONResponse(
            status_code=exc.status_code,
            content=AppError(
                code=exc.code,
                message=exc.message,
                detail=exc.detail,
            ).model_dump(),
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        logger.warning(f"ValueError: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=AppError(
                code="VALIDATION_ERROR",
                message="validation failed",
                detail=str(exc),
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception: {type(exc).__name__} - {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=AppError(
                code="INTERNAL_ERROR",
                message="Internal server error",
                detail=str(exc) if get_settings().debug else None,
            ).model_dump(),
        )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


# ==================== 生命周期 ====================


@asynccontextmanager
async def _lifespan(app: FastAPI):
    init_logging()
    logger.info("DeepDoc RAG Service starting...")
    logger.info(f"Version: {get_settings().app_version}")
    logger.info(f"Debug mode: {get_settings().debug}")

    from pathlib import Path
    upload_dir = Path(get_settings().upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    from app.core.database import init_db
    await init_db()

    yield
    logger.info("DeepDoc RAG Service shutting down...")


# ==================== 创建应用 ====================


app = create_app()


# ==================== 路由注册 ====================


from app.api import documents
from app.api import evaluation
from app.api import retrieval as retrieval_api
from app.api import ask as ask_api
from app.api import compare as compare_api
from app.api import suggest as suggest_api

app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(retrieval_api.router, prefix="/api/retrieve", tags=["Retrieval"])
app.include_router(ask_api.router, prefix="/api/ask", tags=["Ask"])
app.include_router(compare_api.router, prefix="/api/compare", tags=["Compare"])
app.include_router(suggest_api.router, prefix="/api/suggest", tags=["Suggest"])


# ==================== 评估路由（直接定义） ====================


from pydantic import BaseModel, Field


class EvaluateRequest(BaseModel):
    doc_id: str
    eval_file: str | None = None
    use_hierarchy: bool = True
    top_k: int = 5


class EvaluateResponse(BaseModel):
    eval_id: str
    status: str
    message: str


@app.post("/evaluate", tags=["Evaluation"])
async def evaluate(request: EvaluateRequest, background_tasks: BackgroundTasks):
    """评估接口"""
    return {"eval_id": "eval_test", "status": "ok", "message": "Evaluation started"}


@app.get("/history/{doc_id}", tags=["Evaluation"])
async def get_history(doc_id: str):
    """评估历史"""
    return {"doc_id": doc_id, "history": []}


# ==================== 基础路由 ====================


@app.get("/")
async def root():
    return {"message": "DeepDoc RAG Service", "version": get_settings().app_version}


@app.get("/health", tags=["Health"])
async def health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=get_settings().app_version,
        uptime=time.time() - _start_time,
    )