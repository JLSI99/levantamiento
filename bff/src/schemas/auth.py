from pydantic import BaseModel, EmailStr, Field
from typing import List

class UserPayload(BaseModel):
    id: str
    username: str
    email: str
    role: str
    capabilities: List[str] = Field(default_factory=list)

class UserLogin(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserPayload