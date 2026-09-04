import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.session import init_db
from backend.routes.cart import router as cart_router
from backend.routes.products import router as products_router

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


@app.get("/")
def root():
    return {
        "message": "VocalCart API is running",
        "docs": "/docs"
    }

app.include_router(products_router)
app.include_router(cart_router)
