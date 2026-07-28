import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app import auth, db
from app.models import Base, Post, Tool, User
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=db.engine)
    session = db.SessionLocal()
    try:
        seed_if_empty(session)
    finally:
        session.close()
    yield


app = FastAPI(title="Woods & Tools API", lifespan=lifespan)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- schemas ----


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PostCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    excerpt: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1)
    image_url: str | None = None


class ToolCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    price_cents: int = Field(gt=0)
    image_url: str | None = None


# ---- health ----


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict:
    try:
        db.ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok"}


# ---- auth ----


@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, session: Session = Depends(db.get_session)) -> dict:
    if session.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=auth.hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = auth.create_access_token(user.id)
    return {"access_token": token, "user": user.as_dict()}


@app.post("/auth/login")
def login(payload: LoginRequest, session: Session = Depends(db.get_session)) -> dict:
    user = session.query(User).filter(User.email == payload.email).first()
    if user is None or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(user.id)
    return {"access_token": token, "user": user.as_dict()}


@app.get("/auth/me")
def me(current_user: User = Depends(auth.get_current_user)) -> dict:
    return current_user.as_dict()


# ---- posts ----


@app.get("/posts")
def list_posts(session: Session = Depends(db.get_session)) -> list[dict]:
    posts = session.query(Post).order_by(Post.created_at.desc()).all()
    return [p.as_dict() for p in posts]


@app.get("/posts/{post_id}")
def get_post(post_id: int, session: Session = Depends(db.get_session)) -> dict:
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post.as_dict()


@app.post("/posts", status_code=201)
def create_post(
    payload: PostCreateRequest,
    current_user: User = Depends(auth.get_current_user),
    session: Session = Depends(db.get_session),
) -> dict:
    post = Post(
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        image_url=payload.image_url,
        author=current_user.name,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post.as_dict()


# ---- tools (marketplace listings, no checkout) ----


@app.get("/tools")
def list_tools(session: Session = Depends(db.get_session)) -> list[dict]:
    tools = session.query(Tool).order_by(Tool.created_at.desc()).all()
    return [t.as_dict() for t in tools]


@app.post("/tools", status_code=201)
def create_tool(
    payload: ToolCreateRequest,
    current_user: User = Depends(auth.get_current_user),
    session: Session = Depends(db.get_session),
) -> dict:
    tool = Tool(
        title=payload.title,
        description=payload.description,
        price_cents=payload.price_cents,
        image_url=payload.image_url,
        seller_id=current_user.id,
        seller_name=current_user.name,
    )
    session.add(tool)
    session.commit()
    session.refresh(tool)
    return tool.as_dict()
