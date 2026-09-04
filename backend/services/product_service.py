import json
from pathlib import Path
from typing import Any

PRODUCTS_FILE = Path(__file__).resolve().parents[2] / "api" / "products.json"

PRODUCT_SIMILAR_WORDS: dict[str, list[str]] = {
    "smartphone pro": [
        "phone", "mobile", "device", "smart phone", "smartphone", "cell phone",
        "handset", "telephone", "mobile phone", "smartfone", "fone", "celphone",
        "smatphone", "smartfon",
    ],
    "luxury laptop": [
        "notebook", "ultrabook", "labtop", "lapptop", "computer", "macbook",
        "lap top", "leptop", "loptop", "notbuk", "labtop",
    ],
    "noise-canceling headphones": [
        "headset", "earphones", "head phones", "noise canceling", "ear pods",
        "head phone", "noise cancelling", "headfones", "hedphones",
        "noise cansling", "earbuds", "headphones",
    ],
    "premium whiskey": [
        "whisky", "scotch", "bourbon", "wiskey", "wisky", "whiskey", "whiski",
        "wine", "liquor", "whiskyy", "wee whiskey", "wiskyy",
    ],
    "imported champagne": [
        "shampain", "champane", "sparkling wine", "champaign", "shampagne",
        "bubbly", "champers", "spumante", "sham pain", "cham pagne",
    ],
    "designer handbag": [
        "purse", "bag", "clutch", "hand bag", "designer purse", "hanbag",
        "purs", "designer bag", "hand bug",
    ],
    "organic matcha set": [
        "green tea", "matcha", "macha", "mat cha", "tea set", "organic tea",
        "green tea powder", "japanese tea",
    ],
    "artisan coffee beans": [
        "specialty coffee", "coffee", "artisan coffee", "beans", "gourmet coffee",
        "premium coffee", "cofee", "coffe",
    ],
}


def load_products() -> list[dict[str, Any]]:
    """Load products from the existing JSON catalog, deduplicated by id."""
    try:
        with PRODUCTS_FILE.open(encoding="utf-8") as file:
            raw_products = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

    if not isinstance(raw_products, list):
        return []

    products: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for item in raw_products:
        if not isinstance(item, dict):
            continue
        product_id = item.get("id")
        if product_id is None or product_id in seen_ids:
            continue
        seen_ids.add(product_id)
        products.append(item)

    return products


def get_all_products() -> list[dict[str, Any]]:
    return load_products()


def get_product_by_id(product_id: int) -> dict[str, Any] | None:
    for product in load_products():
        if product.get("id") == product_id:
            return product
    return None


def _text_fields_match(product: dict[str, Any], query: str) -> bool:
    """Case-insensitive match against name, description, and category."""
    fields = [
        str(product.get("name", "")),
        str(product.get("description", "")),
        str(product.get("category", "")),
    ]
    return any(query in field.lower() for field in fields)


def _voice_style_match(product: dict[str, Any], query: str) -> bool:
    """Match logic ported from the frontend voice product matcher."""
    name = str(product.get("name", "")).lower()
    query = query.lower()

    if name == query:
        return True

    similar_words = PRODUCT_SIMILAR_WORDS.get(name, [])
    if query in similar_words or query == name:
        return True

    product_words = name.split()
    for word in product_words:
        if word.startswith(query) or query.startswith(word):
            return True

    if query in name or name in query:
        return True

    for word in query.split():
        if word in similar_words:
            return True
        for product_word in product_words:
            if product_word.startswith(word) or word.startswith(product_word):
                return True

    return False


def search_products(query: str) -> list[dict[str, Any]]:
    """Search products by query with case-insensitive and voice-style matching."""
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    results: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for product in load_products():
        product_id = product.get("id")
        if product_id in seen_ids:
            continue

        if _text_fields_match(product, normalized_query) or _voice_style_match(
            product, normalized_query
        ):
            results.append(product)
            seen_ids.add(product_id)

    return results
