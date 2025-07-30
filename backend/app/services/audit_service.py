from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog, ActionType


class AuditService:
    """Service for managing audit logs"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        user_id: int,
        action_type: ActionType,
        table_name: str,
        record_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log an audit action"""

        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)

        return audit_log


async def log_audit(
    db: AsyncSession,
    user_id: int,
    action_type: str,
    table_name: str,
    record_id: Optional[int] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Standalone function to log audit actions"""
    # Convert string action_type to enum if needed
    if isinstance(action_type, str):
        action_type = ActionType(action_type)

    audit_log = AuditLog(
        user_id=user_id,
        action_type=action_type,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.add(audit_log)
    await db.commit()
    await db.refresh(audit_log)

    return audit_log
