from fastapi import Depends, HTTPException, Header
from jose import JWTError, jwt
from supabase import create_client, Client

from config import settings


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.removeprefix("Bearer ")
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return {"user_id": user_id, "token": token}


def get_db(user: dict = Depends(get_current_user)) -> Client:
    """Supabase client scoped to the authenticated user (RLS applies)."""
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(user["token"])
    return client


def get_admin_db() -> Client:
    """Service-role client that bypasses RLS — use sparingly."""
    return create_client(settings.supabase_url, settings.supabase_service_key)
