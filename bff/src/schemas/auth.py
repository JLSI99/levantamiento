from pydantic import BaseModel, Field
from typing import List

class UserLoginBFF(BaseModel):
    identifier: str = Field(..., description="Username o Email institucional enviado desde React")
    password: str

class TokenBFF(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshBFF(BaseModel):
    refresh_token: str