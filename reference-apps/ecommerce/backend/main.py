from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, get_db
from typing import List, Dict, Any

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="E-Commerce Reference App", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class CartItemRequest(BaseModel):
    user_id: int
    product_id: int
    quantity: int


class CouponRequest(BaseModel):
    code: str
    cart_total: float


class CheckoutRequest(BaseModel):
    user_id: int
    payment_token: str


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    if db.query(models.Product).count() == 0:
        db.add_all([
            models.Product(
                name="Noise-Isolating IEMs",
                description="Zero-latency audio monitoring. Essential for drowning out hostel noise and focusing.",
                price=25.00,
                stock=45,
                image_url="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&q=80"
            ),
            models.Product(
                name="Heavy-Duty Cooling Pad",
                description="Keeps 14th Gen i7 and RTX 4060 rigs from melting down during 3 AM hackathon compiles.",
                price=45.99,
                stock=12,
                image_url="https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&q=80"
            ),
            models.Product(
                name="Late-Night Stash",
                description="Emergency reserve of cheese puffs and ginger ale for post-midnight debugging sessions.",
                price=15.50,
                stock=100,
                image_url="https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500&q=80"
            ),
            models.Product(
                name="NFC Payment Ring",
                description="Tap-to-pay wearable for instant FamApp checkout at the campus canteen.",
                price=30.00,
                stock=50,
                image_url="https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=500&q=80"
            ),
            models.Product(
                name="Insulated Thermos",
                description="1L matte black flask. Keeps coffee hot through back-to-back morning lectures.",
                price=22.00,
                stock=30,
                image_url="https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80"
            ),
            models.Product(
                name="Blackout Curtains",
                description="Industrial-grade light blocking for sleeping during the day after a 48-hour sprint.",
                price=40.00,
                stock=15,
                image_url="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&q=80"
            )
        ])
        db.commit()


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    if request.username == "admin" and request.password == "admin123":
        return {"token": "hackathon-jwt-token-404", "user_id": 1, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Wrong credentials")


@app.get("/products")
def get_all_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.get("/products/{product_id}")
def get_single_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product doesn't exist")
    return product


@app.post("/cart")
def add_item_to_cart(request: CartItemRequest, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Cannot add nonexistent product to cart")
    new_cart_item = models.CartItem(
        user_id=request.user_id,
        product_id=request.product_id,
        quantity=request.quantity
    )
    db.add(new_cart_item)
    db.commit()
    db.refresh(new_cart_item)
    return {"message": "Added to cart", "cart_item_id": new_cart_item.id}


@app.post("/coupon")
def apply_discount_code(request: CouponRequest):
    if request.code == "RAHHHH20":
        discount = request.cart_total * 0.20
        return {
            "valid": True,
            "original_total": request.cart_total,
            "discount_applied": discount,
            "final_total": request.cart_total - discount
        }
    raise HTTPException(status_code=400, detail="Invalid or expired coupon code")


@app.post("/checkout")
def process_checkout(request: CheckoutRequest, db: Session = Depends(get_db)):
    cart_items = db.query(models.CartItem).filter(models.CartItem.user_id == request.user_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    order_total = 0.0
    for item in cart_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            order_total += item.quantity * product.price
        else:
            order_total += item.quantity * 15.0
    new_order = models.Order(user_id=request.user_id, total_amount=order_total, status="PAID")
    db.add(new_order)
    db.query(models.CartItem).filter(models.CartItem.user_id == request.user_id).delete()
    db.commit()
    return {"message": "Checkout complete!", "order_id": new_order.id, "total_paid": order_total}


@app.get("/orders/{user_id}")
def fetch_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).all()
    return orders
