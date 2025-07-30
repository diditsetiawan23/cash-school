from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import FinancialRecord, User, TransactionType
from app.schemas.schemas import (
    PaginatedFinancialRecordsResponse,
    FinancialRecordResponse,
    BalanceResponse,
)

router = APIRouter()


@router.get("/transactions", response_model=PaginatedFinancialRecordsResponse)
async def get_public_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get transactions for public view (no authentication required)"""

    # Build query
    query = (
        select(FinancialRecord)
        .options(selectinload(FinancialRecord.created_by_user))
        .where(FinancialRecord.is_deleted == False)
    )

    # Apply filters
    if transaction_type and transaction_type in ["credit", "debit"]:
        query = query.where(
            FinancialRecord.transaction_type == TransactionType(transaction_type)
        )

    if search:
        search_filter = or_(
            FinancialRecord.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.where(FinancialRecord.created_at >= start_datetime)
        except ValueError:
            pass  # Skip invalid date format

    if end_date:
        try:
            # Add 23:59:59 to include the entire end date
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            query = query.where(FinancialRecord.created_at <= end_datetime)
        except ValueError:
            pass  # Skip invalid date format

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(FinancialRecord.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    # Execute query
    result = await db.execute(query)
    transactions = result.scalars().all()

    # Calculate pagination info
    pages = (total + per_page - 1) // per_page

    return PaginatedFinancialRecordsResponse(
        items=[
            FinancialRecordResponse(
                id=t.id,
                amount=t.amount,
                description=t.description,
                transaction_type=t.transaction_type,
                created_by=t.created_by,
                created_at=t.created_at,
                updated_at=t.updated_at,
                is_deleted=t.is_deleted,
                created_by_user=t.created_by_user,
            )
            for t in transactions
        ],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/balance", response_model=BalanceResponse)
async def get_public_balance(db: AsyncSession = Depends(get_db)):
    """Get balance information for public view (no authentication required)"""

    # Calculate totals
    credit_query = select(func.coalesce(func.sum(FinancialRecord.amount), 0)).where(
        and_(
            FinancialRecord.transaction_type == TransactionType.CREDIT,
            FinancialRecord.is_deleted == False,
        )
    )

    debit_query = select(func.coalesce(func.sum(FinancialRecord.amount), 0)).where(
        and_(
            FinancialRecord.transaction_type == TransactionType.DEBIT,
            FinancialRecord.is_deleted == False,
        )
    )

    credit_result = await db.execute(credit_query)
    debit_result = await db.execute(debit_query)

    total_credits = credit_result.scalar() or 0
    total_debits = debit_result.scalar() or 0
    balance = total_credits - total_debits

    return BalanceResponse(
        balance=balance,
        total_credits=total_credits,
        total_debits=total_debits,
    )
