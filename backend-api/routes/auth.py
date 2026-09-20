import secrets

import bcrypt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from database import get_user_by_email, update_user_token

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    email: str
    token: str


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = await get_user_by_email(payload.email)

    if user is None or not bcrypt.checkpw(
        payload.password.encode("utf-8"), user["password"].encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = secrets.token_urlsafe(32)
    await update_user_token(payload.email, token)

    return LoginResponse(email=payload.email, token=token)
