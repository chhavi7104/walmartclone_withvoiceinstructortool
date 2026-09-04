from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.products import router as products_router

app = FastAPI(title="VocalCart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {
        "message": "VocalCart API is running",
        "docs": "/docs"
    }

app.include_router(products_router)
