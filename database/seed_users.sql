-- Cash Management Database Seed Script - Users Data
-- This script inserts the specific user requested

-- Insert user with email "irhascandrawardani@gmail.com"
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES 
    (
        'irhas.wardani',
        'irhascandrawardani@gmail.com',
        '$2b$12$jadqZpSePiytq7Cpi2Jk/uZey/IYFyQybIaOSBFnqBuZNfkwavdHW',
        'Irhas Candra Wardani',
        'Admin',
        true,
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Insert audit log for user creation
INSERT INTO audit_logs (user_id, action_type, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
SELECT 
    u.id,
    'CREATE',
    'users',
    u.id,
    NULL,
    jsonb_build_object(
        'username', u.username,
        'email', u.email,
        'full_name', u.full_name,
        'role', u.role,
        'is_active', u.is_active
    ),
    '127.0.0.1',
    'Database Seed Script',
    NOW()
FROM users u
WHERE u.email = 'irhascandrawardani@gmail.com';

-- Display created user
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'User seeding completed!';
    RAISE NOTICE 'Total users in database: %', user_count;
    RAISE NOTICE '';
    RAISE NOTICE 'User created:';
    RAISE NOTICE 'Email: irhascandrawardani@gmail.com';
    RAISE NOTICE 'Username: irhas.wardani';
    RAISE NOTICE 'Password: admin123';
    RAISE NOTICE 'Role: admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Password is hashed using bcrypt.';
END $$;
