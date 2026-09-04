from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.cart import AddCartItemRequest, CartResponse, UpdateCartItemRequest
from backend.services import cart_service

router = APIRouter(prefix="/api/cart", tags=["cart"])


def require_session_id(x_session_id: str | None = Header(default=None)) -> str:
    if not x_session_id or len(x_session_id) > 64:
        raise HTTPException(status_code=400, detail="A valid session is required")
    return x_session_id


@router.get("", response_model=CartResponse)
def get_cart(
    session_id: str = Depends(require_session_id),
    db: Session = Depends(get_db),
) -> dict:
    return cart_service.serialize_cart(cart_service.get_cart(db, session_id))


@router.post("/items", response_model=CartResponse)
def add_cart_item(
    request: AddCartItemRequest,
    session_id: str = Depends(require_session_id),
    db: Session = Depends(get_db),
) -> dict:
    try:
        cart = cart_service.add_item(db, session_id, request.product_id, request.quantity)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return cart_service.serialize_cart(cart)


@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    request: UpdateCartItemRequest,
    session_id: str = Depends(require_session_id),
    db: Session = Depends(get_db),
) -> dict:
    try:
        cart = cart_service.update_item(db, session_id, item_id, request.quantity)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return cart_service.serialize_cart(cart)


@router.delete("/items/{item_id}", response_model=CartResponse)
def delete_cart_item(
    item_id: int,
    session_id: str = Depends(require_session_id),
    db: Session = Depends(get_db),
) -> dict:
    try:
        cart = cart_service.remove_item(db, session_id, item_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return cart_service.serialize_cart(cart)


@router.delete("", response_model=CartResponse)
def delete_cart(
    session_id: str = Depends(require_session_id),
    db: Session = Depends(get_db),
) -> dict:
    return cart_service.serialize_cart(cart_service.clear_cart(db, session_id))
