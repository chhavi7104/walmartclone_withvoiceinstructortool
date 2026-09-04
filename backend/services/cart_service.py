from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.database.models import Cart, CartItem
from backend.services import product_service


def get_or_create_cart(db: Session, session_id: str) -> Cart:
    cart = db.scalar(
        select(Cart).options(selectinload(Cart.items)).where(Cart.session_id == session_id)
    )
    if cart is None:
        cart = Cart(session_id=session_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def get_cart(db: Session, session_id: str) -> Cart:
    return get_or_create_cart(db, session_id)


def add_item(db: Session, session_id: str, product_id: int, quantity: int) -> Cart:
    product = product_service.get_product_by_id(product_id)
    if product is None:
        raise ValueError("Product not found")

    cart = get_or_create_cart(db, session_id)
    item = next((cart_item for cart_item in cart.items if cart_item.product_id == product_id), None)
    if item is None:
        item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
        db.add(item)
    else:
        item.quantity += quantity

    db.commit()
    return get_cart(db, session_id)


def update_item(db: Session, session_id: str, item_id: int, quantity: int) -> Cart:
    cart = get_cart(db, session_id)
    item = next((cart_item for cart_item in cart.items if cart_item.id == item_id), None)
    if item is None:
        raise LookupError("Cart item not found")

    item.quantity = quantity
    db.commit()
    return get_cart(db, session_id)


def remove_item(db: Session, session_id: str, item_id: int) -> Cart:
    cart = get_cart(db, session_id)
    item = next((cart_item for cart_item in cart.items if cart_item.id == item_id), None)
    if item is None:
        raise LookupError("Cart item not found")

    db.delete(item)
    db.commit()
    return get_cart(db, session_id)


def clear_cart(db: Session, session_id: str) -> Cart:
    cart = get_cart(db, session_id)
    for item in list(cart.items):
        db.delete(item)
    db.commit()
    return get_cart(db, session_id)


def serialize_cart(cart: Cart) -> dict:
    items = []
    total_quantity = 0
    subtotal = 0

    for item in cart.items:
        product = product_service.get_product_by_id(item.product_id)
        if product is None:
            continue
        line_total = int(product["price"]) * item.quantity
        total_quantity += item.quantity
        subtotal += line_total
        items.append(
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "product": product,
                "line_total": line_total,
            }
        )

    return {
        "id": cart.id,
        "items": items,
        "total_quantity": total_quantity,
        "subtotal": subtotal,
        "total": subtotal,
    }
