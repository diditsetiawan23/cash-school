from datetime import datetime, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import User, FinancialRecord, TransactionType
from ..schemas.schemas import (
    FinancialRecordCreate,
    FinancialRecordUpdate,
    FinancialRecordResponse,
    FinancialRecordFilters,
    PaginatedFinancialRecordsResponse,
    BalanceResponse,
)
from ..services.audit_service import log_audit

router = APIRouter()


@router.get("/", response_model=PaginatedFinancialRecordsResponse)
async def get_transactions(
    filters: FinancialRecordFilters = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all financial records with filtering and pagination."""
    try:
        # Build query
        query = select(FinancialRecord).options(
            selectinload(FinancialRecord.created_by_user)
        )

        # Apply filters
        conditions = []

        if filters.transaction_type:
            conditions.append(
                FinancialRecord.transaction_type == filters.transaction_type.value
            )

        if filters.start_date:
            start_datetime = datetime.combine(filters.start_date, time.min)
            conditions.append(FinancialRecord.created_at >= start_datetime)

        if filters.end_date:
            end_datetime = datetime.combine(filters.end_date, time.max)
            conditions.append(FinancialRecord.created_at <= end_datetime)

        if filters.search:
            conditions.append(FinancialRecord.description.ilike(f"%{filters.search}%"))

        if conditions:
            query = query.where(and_(*conditions))

        # Apply soft delete filter
        query = query.where(FinancialRecord.is_deleted == False)

        # Order by created_at desc
        query = query.order_by(FinancialRecord.created_at.desc())

        # Count total records
        count_query = select(func.count(FinancialRecord.id)).where(
            and_(FinancialRecord.is_deleted == False, *conditions)
            if conditions
            else FinancialRecord.is_deleted == False
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        query = query.offset(filters.skip).limit(filters.limit)

        # Execute query
        result = await db.execute(query)
        records = result.scalars().all()

        return PaginatedFinancialRecordsResponse(
            items=[
                FinancialRecordResponse.model_validate(record) for record in records
            ],
            total=total,
            page=filters.page,
            per_page=filters.limit,
            pages=(total + filters.limit - 1) // filters.limit if total > 0 else 0,
        )

    except Exception as e:
        print(f"Error in get_transactions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=FinancialRecordResponse)
async def create_transaction(
    transaction: FinancialRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new financial record. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Create new record
        db_record = FinancialRecord(
            amount=transaction.amount,
            description=transaction.description,
            transaction_type=transaction.transaction_type.value,
            created_by=current_user.id,
        )

        db.add(db_record)
        await db.commit()
        await db.refresh(db_record)

        # Load the created_by_user relationship
        result = await db.execute(
            select(FinancialRecord)
            .options(selectinload(FinancialRecord.created_by_user))
            .where(FinancialRecord.id == db_record.id)
        )
        db_record = result.scalar_one()

        # Log audit
        await log_audit(
            db=db,
            user_id=current_user.id,
            action_type="CREATE",
            table_name="financial_records",
            record_id=db_record.id,
            new_values={
                "amount": float(transaction.amount),
                "description": transaction.description,
                "transaction_type": transaction.transaction_type.value,
            },
        )

        return FinancialRecordResponse.model_validate(db_record)

    except Exception as e:
        await db.rollback()
        print(f"Error in create_transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to create transaction")


@router.put("/{record_id}", response_model=FinancialRecordResponse)
async def update_transaction(
    record_id: int,
    transaction: FinancialRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a financial record. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Get existing record
        result = await db.execute(
            select(FinancialRecord)
            .options(selectinload(FinancialRecord.created_by_user))
            .where(
                and_(
                    FinancialRecord.id == record_id, FinancialRecord.is_deleted == False
                )
            )
        )
        db_record = result.scalar_one_or_none()

        if not db_record:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Store old values for audit
        old_values = {
            "amount": float(db_record.amount),
            "description": db_record.description,
            "transaction_type": db_record.transaction_type,
        }

        # Update fields
        if transaction.amount is not None:
            db_record.amount = transaction.amount
        if transaction.description is not None:
            db_record.description = transaction.description
        if transaction.transaction_type is not None:
            db_record.transaction_type = transaction.transaction_type.value

        db_record.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(db_record)

        # Store new values for audit
        new_values = {
            "amount": float(db_record.amount),
            "description": db_record.description,
            "transaction_type": db_record.transaction_type,
        }

        # Log audit
        await log_audit(
            db=db,
            user_id=current_user.id,
            action_type="UPDATE",
            table_name="financial_records",
            record_id=db_record.id,
            old_values=old_values,
            new_values=new_values,
        )

        return FinancialRecordResponse.model_validate(db_record)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error in update_transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to update transaction")


@router.delete("/{record_id}")
async def delete_transaction(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a financial record. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Get existing record
        result = await db.execute(
            select(FinancialRecord).where(
                and_(
                    FinancialRecord.id == record_id, FinancialRecord.is_deleted == False
                )
            )
        )
        db_record = result.scalar_one_or_none()

        if not db_record:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Store old values for audit
        old_values = {
            "amount": float(db_record.amount),
            "description": db_record.description,
            "transaction_type": db_record.transaction_type,
            "is_deleted": False,
        }

        # Soft delete
        db_record.is_deleted = True
        db_record.updated_at = datetime.utcnow()

        await db.commit()

        # Log audit
        await log_audit(
            db=db,
            user_id=current_user.id,
            action_type="DELETE",
            table_name="financial_records",
            record_id=db_record.id,
            old_values=old_values,
            new_values={"is_deleted": True},
        )

        return {"message": "Transaction deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error in delete_transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete transaction")


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get current balance by calculating all non-deleted transactions."""
    try:
        # Calculate total credits
        credit_result = await db.execute(
            select(func.coalesce(func.sum(FinancialRecord.amount), 0)).where(
                and_(
                    FinancialRecord.transaction_type == TransactionType.credit.value,
                    FinancialRecord.is_deleted == False,
                )
            )
        )
        total_credits = credit_result.scalar()

        # Calculate total debits
        debit_result = await db.execute(
            select(func.coalesce(func.sum(FinancialRecord.amount), 0)).where(
                and_(
                    FinancialRecord.transaction_type == TransactionType.debit.value,
                    FinancialRecord.is_deleted == False,
                )
            )
        )
        total_debits = debit_result.scalar()

        # Calculate balance (credits - debits)
        balance = total_credits - total_debits

        return BalanceResponse(
            balance=balance, total_credits=total_credits, total_debits=total_debits
        )

    except Exception as e:
        print(f"Error in get_balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate balance")
