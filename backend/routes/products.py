from fastapi import APIRouter, HTTPException, Query

from backend.services import product_service

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/products")
def list_products() -> list[dict]:
    products = product_service.get_all_products()
    if not products:
        return []
    return products


@router.get("/products/search")
def search_products(q: str = Query(default="", description="Search query")) -> list[dict]:
    normalized_query = q.strip()
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    return product_service.search_products(normalized_query)


@router.get("/products/{product_id}")
def get_product(product_id: int) -> dict:
    product = product_service.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product
