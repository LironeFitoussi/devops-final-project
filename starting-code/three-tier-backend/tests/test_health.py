import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    resp = client.post(
        "/auth/register",
        json={"email": "smoke-test@example.com", "name": "Smoke Test", "password": "hunter22"},
    )
    if resp.status_code == 409:
        resp = client.post(
            "/auth/login", json={"email": "smoke-test@example.com", "password": "hunter22"}
        )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_db(client):
    resp = client.get("/health/db")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_posts(client):
    resp = client.get("/posts")
    assert resp.status_code == 200
    posts = resp.json()
    assert len(posts) >= 5
    assert {"id", "title", "author", "excerpt", "content", "image_url", "created_at"} <= posts[
        0
    ].keys()


def test_get_post(client):
    posts = client.get("/posts").json()
    first_id = posts[0]["id"]
    resp = client.get(f"/posts/{first_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == first_id


def test_get_post_not_found(client):
    resp = client.get("/posts/999999")
    assert resp.status_code == 404


def test_register_login_me(client):
    email = "reg-flow@example.com"
    resp = client.post(
        "/auth/register", json={"email": email, "name": "Reg Flow", "password": "hunter22"}
    )
    assert resp.status_code in (201, 409)  # 409 if a prior run already registered it

    resp = client.post("/auth/login", json={"email": email, "password": "hunter22"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"email": "wrongpass@example.com", "name": "X", "password": "hunter22"},
    )
    resp = client.post(
        "/auth/login", json={"email": "wrongpass@example.com", "password": "nope"}
    )
    assert resp.status_code == 401


def test_create_post_requires_auth(client):
    resp = client.post(
        "/posts", json={"title": "t", "excerpt": "e", "content": "c"}
    )
    assert resp.status_code in (401, 403)


def test_create_post_authenticated(client, auth_headers):
    resp = client.post(
        "/posts",
        json={
            "title": "Sharpening on a Budget",
            "excerpt": "You don't need $300 in stones.",
            "content": "A cheap diamond plate and a strop will get you there.",
            "image_url": "https://images.example.com/sharpening-stones.jpg",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Sharpening on a Budget"
    assert body["author"] == "Smoke Test"
    assert body["image_url"] == "https://images.example.com/sharpening-stones.jpg"


def test_create_and_list_tools(client, auth_headers):
    resp = client.post(
        "/tools",
        json={
            "title": "Vintage No. 4 Hand Plane",
            "description": "Restored, blade freshly sharpened.",
            "price_cents": 8500,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    tool = resp.json()
    assert tool["price_cents"] == 8500
    assert tool["seller_name"] == "Smoke Test"

    resp = client.get("/tools")
    assert resp.status_code == 200
    tools = resp.json()
    assert any(t["id"] == tool["id"] for t in tools)


def test_create_tool_requires_auth(client):
    resp = client.post(
        "/tools", json={"title": "t", "description": "d", "price_cents": 100}
    )
    assert resp.status_code in (401, 403)
