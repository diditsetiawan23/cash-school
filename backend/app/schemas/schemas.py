from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.models import UserRole, TransactionType, ActionType


# Base schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.VIEWER
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    password_hash: str


# Authentication schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


# Financial Record schemas
class FinancialRecordBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    transaction_type: TransactionType


class FinancialRecordCreate(FinancialRecordBase):
    pass


class FinancialRecordUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    transaction_type: Optional[TransactionType] = None


class FinancialRecordResponse(FinancialRecordBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    created_by_user: UserResponse

    class Config:
        from_attributes = True


class FinancialRecordList(BaseModel):
    items: List[FinancialRecordResponse]
    total: int
    page: int
    size: int
    pages: int


class PaginatedFinancialRecordsResponse(BaseModel):
    items: List[FinancialRecordResponse]
    total: int
    page: int
    per_page: int
    pages: int


class BalanceResponse(BaseModel):
    balance: Decimal
    total_credits: Decimal
    total_debits: Decimal


# Audit Log schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action_type: ActionType
    table_name: str
    record_id: Optional[int]
    old_values: Optional[dict]
    new_values: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


class AuditLogList(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int
    pages: int


# Query parameters
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)


class FinancialRecordFilters(PaginationParams):
    transaction_type: Optional[TransactionType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    search: Optional[str] = None
    sort_by: Optional[str] = Field(default="created_at")
    sort_direction: Optional[str] = Field(default="desc")
    per_page: Optional[int] = Field(default=10, ge=1, le=100)

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


class AuditLogFilters(PaginationParams):
    action_type: Optional[ActionType] = None
    table_name: Optional[str] = None
    user_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    search: Optional[str] = None
    sort_by: Optional[str] = Field(default="created_at")
    sort_direction: Optional[str] = Field(default="desc")
    per_page: Optional[int] = Field(default=10, ge=1, le=100)

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


# Standard responses
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
