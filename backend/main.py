import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.database.session import init_db
from backend.routes.cart import router as cart_router
from backend.routes.products import router as products_router
BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="VocalCart API")

configured_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
configured_origins.extend(
    [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "null",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(configured_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(BASE_DIR / "index.html")

app.include_router(products_router)
app.include_router(cart_router)
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="frontend")