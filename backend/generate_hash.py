#!/usr/bin/env python3
"""
Script to generate bcrypt hash for password
"""
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, '/app')

from app.core.security import get_password_hash


def generate_hash():
    """Generate bcrypt hash for admin123"""
    password = "admin123"
    hash_value = get_password_hash(password)
    print(f"Password: {password}")
    print(f"Bcrypt hash: {hash_value}")
    return hash_value


if __name__ == "__main__":
    generate_hash()
