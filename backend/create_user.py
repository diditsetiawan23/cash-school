#!/usr/bin/env python3
"""
Script to create a new user in the database
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import engine
from app.models.models import User, UserRole
from app.core.security import get_password_hash


async def create_user(
    username: str, password: str, email: str, full_name: str, role: str = "admin"
):
    """Create a new user in the database"""

    async with AsyncSession(engine) as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.username == username))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"User '{username}' already exists!")
            return False

        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            role=role,
            is_active=True,
        )

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        print(f"✅ User '{username}' created successfully!")
        print(f"   ID: {new_user.id}")
        print(f"   Email: {new_user.email}")
        print(f"   Full Name: {new_user.full_name}")
        print(f"   Role: {new_user.role}")
        print(f"   Active: {new_user.is_active}")

        return True


async def main():
    """Main function"""
    print("Creating user 'didit'...")

    success = await create_user(
        username="didit",
        password="12345678",
        email="didit@cashschool.com",
        full_name="Didit Admin User",
        role="admin",
    )

    if success:
        print("\n🎉 User creation completed!")
    else:
        print("\n❌ User creation failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
