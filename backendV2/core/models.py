from enum import Enum
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal

class UserType(str, Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"

class ConsentStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"

class LoginRequest(BaseModel):
    userType: UserType
    email: EmailStr
    password: str

class RegisterIndividualRequest(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    bankClientId: Optional[str] = None
    userType: Literal["individual"] = "individual"

class RegisterBusinessRequest(BaseModel):
    companyName: str
    inn: str
    contact: str
    email: EmailStr
    password: str
    bankClientId: Optional[str] = None
    userType: Literal["business"] = "business"

class ConsentRequest(BaseModel):
    bankCode: str
    clientId: Optional[str] = None
