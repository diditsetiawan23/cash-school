from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse, AuditLogList, AuditLogFilters
from app.routers.auth import get_current_user, get_admin_user

router = APIRouter()


@router.get("/", response_model=AuditLogList)
async def get_audit_logs(
    filters: AuditLogFilters = Depends(),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all audit logs with pagination and filtering (admin only)"""
    try:
        # Build the query
        query = select(AuditLog).options(selectinload(AuditLog.user))

        # Apply filters
        if filters.action_type:
            query = query.where(AuditLog.action_type == filters.action_type)

        if filters.table_name:
            query = query.where(AuditLog.table_name == filters.table_name)

        if filters.user_id:
            query = query.where(AuditLog.user_id == filters.user_id)

        if filters.start_date:
            start_datetime = datetime.combine(filters.start_date, time.min)
            query = query.where(AuditLog.created_at >= start_datetime)

        if filters.end_date:
            end_datetime = datetime.combine(filters.end_date, time.max)
            query = query.where(AuditLog.created_at <= end_datetime)

        if filters.search:
            # Search in multiple fields
            search_pattern = f"%{filters.search}%"
            from sqlalchemy import or_

            query = query.where(
                or_(
                    AuditLog.action_type.ilike(search_pattern),
                    AuditLog.table_name.ilike(search_pattern),
                    AuditLog.ip_address.ilike(search_pattern),
                )
            )

        # Count total records
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Apply sorting (default by created_at desc)
        if filters.sort_by == "action_type":
            if filters.sort_direction == "asc":
                query = query.order_by(AuditLog.action_type)
            else:
                query = query.order_by(desc(AuditLog.action_type))
        elif filters.sort_by == "table_name":
            if filters.sort_direction == "asc":
                query = query.order_by(AuditLog.table_name)
            else:
                query = query.order_by(desc(AuditLog.table_name))
        else:  # Default to created_at
            if filters.sort_direction == "asc":
                query = query.order_by(AuditLog.created_at)
            else:
                query = query.order_by(desc(AuditLog.created_at))

        # Apply pagination
        query = query.offset(filters.skip).limit(filters.limit)

        result = await db.execute(query)
        logs = result.scalars().all()

        return AuditLogList(
            items=logs,
            total=total,
            page=filters.page,
            size=filters.limit,
            pages=(total + filters.limit - 1) // filters.limit,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching audit logs: {str(e)}",
        )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit log by ID (admin only)"""
    try:
        result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
        log = result.scalar_one_or_none()

        if not log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found"
            )

        return log
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching audit log: {str(e)}",
        )
