from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
    get_password_hash,
)
from app.models.models import User, ActionType
from app.schemas.schemas import (
    LoginRequest,
    Token,
    UserResponse,
    RefreshTokenRequest,
    MessageResponse,
    PasswordChangeRequest,
    UserUpdate,
)
from app.services.audit_service import AuditService

router = APIRouter()
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = verify_token(token, "access")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


@router.options("/login")
async def login_options():
    """Handle CORS preflight for login endpoint"""
    return {}


@router.post("/login")
async def login(
    request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return tokens"""

    # Find user by username
    result = await db.execute(select(User).where(User.username == login_data.username))
    user = result.scalar_one_or_none()

    # Verify user and password
    if (
        not user
        or not user.is_active
        or not verify_password(login_data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "username": user.username}
    )

    # Log the login action
    audit_service = AuditService(db)
    await audit_service.log_action(
        user_id=user.id,
        action_type=ActionType.LOGIN,
        table_name="users",
        record_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    # Create response
    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 30 * 60,  # 30 minutes
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        },
    }

    return response_data


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""

    payload = verify_token(refresh_data.refresh_token, "refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user.id), "username": user.username}
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 30 * 60,
        "user": UserResponse.model_validate(user),
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout user"""

    # Log the logout action
    audit_service = AuditService(db)
    await audit_service.log_action(
        user_id=current_user.id,
        action_type=ActionType.LOGOUT,
        table_name="users",
        record_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return MessageResponse(message="Successfully logged out")


@router.put("/change-password", response_model=MessageResponse)
async def change_password(
    request: Request,
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password"""

    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash new password
    new_password_hash = get_password_hash(password_data.new_password)

    # Update password
    current_user.password_hash = new_password_hash
    current_user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(current_user)

    # Log the password change action
    audit_service = AuditService(db)
    await audit_service.log_action(
        user_id=current_user.id,
        action_type=ActionType.UPDATE,
        table_name="users",
        record_id=current_user.id,
        new_values={"password_changed": True},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return MessageResponse(message="Password changed successfully")


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: Request,
    profile_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile"""

    # Store old values for audit
    old_values = {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
    }

    # Update fields that are provided
    if profile_data.username is not None:
        # Check if username is already taken
        existing_user = await db.execute(
            select(User).where(
                User.username == profile_data.username, User.id != current_user.id
            )
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )
        current_user.username = profile_data.username

    if profile_data.email is not None:
        # Check if email is already taken
        existing_user = await db.execute(
            select(User).where(
                User.email == profile_data.email, User.id != current_user.id
            )
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
            )
        current_user.email = profile_data.email

    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    current_user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(current_user)

    # Store new values for audit
    new_values = {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
    }

    # Log the profile update action
    audit_service = AuditService(db)
    await audit_service.log_action(
        user_id=current_user.id,
        action_type=ActionType.UPDATE,
        table_name="users",
        record_id=current_user.id,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return current_user


# Dependency for admin users only
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user
