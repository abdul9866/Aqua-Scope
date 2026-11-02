import hashlib
import os
import secrets
import sqlite3
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

DB_PATH = os.path.join(os.path.dirname(__file__), "aqua_users.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'Marine Researcher',
            organization TEXT DEFAULT 'Oceanic AI Research Foundation',
            bio TEXT DEFAULT '',
            joined_date TEXT,
            analyses_count INTEGER DEFAULT 0,
            reports_count INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Check if demo user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@aquascope.org",))
    if not cursor.fetchone():
        demo_pwd_hash = hash_password("password123")
        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash, role, organization, bio, joined_date, analyses_count, reports_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                "Dr. Marina Chen",
                "demo@aquascope.org",
                demo_pwd_hash,
                "Senior Marine Biologist",
                "Oceanic AI Research Foundation",
                "Specializing in benthic ecosystem preservation, computer vision marine debris localization, and deep reef restoration.",
                "October 2024",
                12,
                4,
            ),
        )
    conn.commit()
    conn.close()


def hash_password(password: str, salt: Optional[str] = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split("$", 1)
        expected = hash_password(password, salt)
        return secrets.compare_digest(stored_hash, expected)
    except Exception:
        return False


# Schemas
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Marine Researcher"
    organization: Optional[str] = "Oceanic AI Research Foundation"
    bio: Optional[str] = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None


class IncrementStatRequest(BaseModel):
    stat_type: str  # 'analyses' or 'reports'


def get_current_user_from_token(token: str):
    if not token:
        return None
    # Strip Bearer if present
    if token.startswith("Bearer "):
        token = token[7:]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.name, u.email, u.role, u.organization, u.bio, u.joined_date, u.analyses_count, u.reports_count
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """,
        (token,),
    )
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None


@router.post("/signup")
def signup(req: SignupRequest):
    email = req.email.strip().lower()
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    pwd_hash = hash_password(req.password)
    joined_date = datetime.now().strftime("%B %Y")
    cursor.execute(
        """
        INSERT INTO users (name, email, password_hash, role, organization, bio, joined_date, analyses_count, reports_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
    """,
        (
            req.name.strip(),
            email,
            pwd_hash,
            req.role or "Marine Researcher",
            req.organization or "Oceanic AI Research Foundation",
            req.bio or "",
            joined_date,
        ),
    )
    user_id = cursor.lastrowid

    # Create session token
    token = secrets.token_hex(32)
    cursor.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, datetime.now().isoformat()),
    )
    conn.commit()

    cursor.execute("SELECT id, name, email, role, organization, bio, joined_date, analyses_count, reports_count FROM users WHERE id = ?", (user_id,))
    user = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": user,
        "message": "Account created successfully.",
    }


@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()

    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = user_row["id"]
    token = secrets.token_hex(32)
    cursor.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, datetime.now().isoformat()),
    )
    conn.commit()

    user_data = {
        "id": user_row["id"],
        "name": user_row["name"],
        "email": user_row["email"],
        "role": user_row["role"],
        "organization": user_row["organization"],
        "bio": user_row["bio"],
        "joined_date": user_row["joined_date"],
        "analyses_count": user_row["analyses_count"],
        "reports_count": user_row["reports_count"],
    }
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": user_data,
        "message": "Logged in successfully.",
    }


@router.get("/me")
def me(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing.")
    user = get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return {"success": True, "user": user}


@router.put("/profile")
def update_profile(req: UpdateProfileRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing.")
    user = get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    user_id = user["id"]
    conn = get_db()
    cursor = conn.cursor()

    name = req.name.strip() if req.name is not None else user["name"]
    role = req.role.strip() if req.role is not None else user["role"]
    organization = req.organization.strip() if req.organization is not None else user["organization"]
    bio = req.bio.strip() if req.bio is not None else user["bio"]

    cursor.execute(
        """
        UPDATE users
        SET name = ?, role = ?, organization = ?, bio = ?
        WHERE id = ?
    """,
        (name, role, organization, bio, user_id),
    )
    conn.commit()

    cursor.execute("SELECT id, name, email, role, organization, bio, joined_date, analyses_count, reports_count FROM users WHERE id = ?", (user_id,))
    updated_user = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "user": updated_user,
        "message": "Profile updated successfully.",
    }


@router.post("/stats/increment")
def increment_stat(req: IncrementStatRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing.")
    user = get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session.")

    conn = get_db()
    cursor = conn.cursor()
    if req.stat_type == "analyses":
        cursor.execute("UPDATE users SET analyses_count = analyses_count + 1 WHERE id = ?", (user["id"],))
    elif req.stat_type == "reports":
        cursor.execute("UPDATE users SET reports_count = reports_count + 1 WHERE id = ?", (user["id"],))
    conn.commit()

    cursor.execute("SELECT id, name, email, role, organization, bio, joined_date, analyses_count, reports_count FROM users WHERE id = ?", (user["id"],))
    updated_user = dict(cursor.fetchone())
    conn.close()

    return {"success": True, "user": updated_user}


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization[7:] if authorization.startswith("Bearer ") else authorization
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"success": True, "message": "Logged out successfully."}


# Initialize DB on module import
init_db()

