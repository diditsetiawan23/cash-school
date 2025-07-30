-- Cash Management Database Initialization Script
-- This script is executed first when the PostgreSQL container starts
-- Additional setup scripts will run after this in alphabetical order

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create schema if needed (usually 'public' is default)
-- CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE cash_management TO "user";

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Next: Table creation and user seeding will follow...';
END $$;
