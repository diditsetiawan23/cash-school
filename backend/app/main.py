from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from typing import Dict, Any

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.routers import auth, users, transactions, audit, public

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting up Cash Management API...")

    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables created successfully")
    yield

    # Shutdown
    logger.info("Shutting down Cash Management API...")
    await engine.dispose()


# Create FastAPI app
app = FastAPI(
    title="Cash Management API",
    description="A comprehensive class cash management system for schools",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add trusted host middleware (security) - Temporarily disabled for debugging
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=(
#         ["localhost", "127.0.0.1", "*.localhost", "172.*", "192.168.*", "10.*", "*"]
#         if settings.DEBUG
#         else ["yourdomain.com"]
#     ),
# )

# Add CORS middleware
if settings.DEBUG:
    # Development mode - allow all origins but no credentials with wildcard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
else:
    # Production mode - specific origins with credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )


# Request timing middleware - temporarily disabled for CORS debugging
# @app.middleware("http")
# async def add_process_time_header(request: Request, call_next):
#     start_time = time.time()
#     response = await call_next(request)
#     process_time = time.time() - start_time
#     response.headers["X-Process-Time"] = str(process_time)
#     return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)

    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    # Don't expose internal errors in production
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time(), "version": "1.0.0"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cash Management API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Contact administrator",
    }


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(
    transactions.router, prefix="/api/transactions", tags=["Transactions"]
)
app.include_router(audit.router, prefix="/api/audit-logs", tags=["Audit Logs"])
app.include_router(public.router, prefix="/api/public", tags=["Public"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
