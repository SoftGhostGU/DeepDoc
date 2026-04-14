"""DeepDoc RAG Service 入口"""
import uvicorn

from app.main import app


def main() -> None:
    """启动服务"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()