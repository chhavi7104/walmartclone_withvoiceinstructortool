from pydantic import BaseModel, Field


class ProductInCart(BaseModel):
    id: int
    name: str
    price: int
    category: str
    description: str
    image: str


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductInCart
    line_total: int


class CartResponse(BaseModel):
    id: int
    items: list[CartItemResponse]
    total_quantity: int
    subtotal: int
    total: int


class AddCartItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1)


class ErrorResponse(BaseModel):
    detail: str
