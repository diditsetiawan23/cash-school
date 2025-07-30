from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User
from app.schemas.schemas import UserCreate, UserResponse, UserUpdate, MessageResponse
from app.routers.auth import get_current_user, get_admin_user

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user (admin only)"""
    try:
        # Check if username or email already exists
        existing_user_query = select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
        result = await db.execute(existing_user_query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.username == user_data.username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists",
                )

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            password_hash=hashed_password,
            role=user_data.role,
            is_active=user_data.is_active,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Create audit log
        from app.services.audit_service import AuditService

        audit_service = AuditService(db)
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="CREATE",
            table_name="users",
            record_id=new_user.id,
            new_values={
                "username": new_user.username,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "role": new_user.role.value,
                "is_active": new_user.is_active,
            },
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        return UserResponse.model_validate(new_user)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}",
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user by ID (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user (admin only)"""
    try:
        # Get existing user
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Check for duplicate username/email (excluding current user)
        if user_data.username or user_data.email:
            existing_query = select(User).where(User.id != user_id)

            conditions = []
            if user_data.username:
                conditions.append(User.username == user_data.username)
            if user_data.email:
                conditions.append(User.email == user_data.email)

            if conditions:
                from sqlalchemy import or_

                existing_query = existing_query.where(or_(*conditions))
                result = await db.execute(existing_query)
                existing_user = result.scalar_one_or_none()

                if existing_user:
                    if existing_user.username == user_data.username:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Username already exists",
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Email already exists",
                        )

        # Store old values for audit
        old_values = {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
        }

        # Update fields
        if user_data.username is not None:
            user.username = user_data.username
        if user_data.email is not None:
            user.email = user_data.email
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        if user_data.role is not None:
            user.role = user_data.role
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        if user_data.password:
            user.password_hash = get_password_hash(user_data.password)

        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        # Create audit log
        from app.services.audit_service import AuditService

        audit_service = AuditService(db)
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="UPDATE",
            table_name="users",
            record_id=user.id,
            old_values=old_values,
            new_values={
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "is_active": user.is_active,
            },
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        return UserResponse.model_validate(user)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}",
        )


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete/deactivate user (admin only)"""
    try:
        # Prevent self-deletion
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )

        # Get existing user
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Store old values for audit
        old_values = {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
        }

        # Deactivate user instead of hard delete
        user.is_active = False
        user.updated_at = datetime.utcnow()

        await db.commit()

        # Create audit log
        from app.services.audit_service import AuditService

        audit_service = AuditService(db)
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="DELETE",
            table_name="users",
            record_id=user.id,
            old_values=old_values,
            new_values={"is_active": False},
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        return MessageResponse(message="User deactivated successfully")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}",
        )
