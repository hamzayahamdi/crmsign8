-- ============================================
-- Add Gestionnaire User to Database
-- ============================================
-- This script adds a test Gestionnaire user to your existing users table
-- Password: gestionnaire123 (hashed with bcrypt)

-- Option 1: Create a new Gestionnaire user
INSERT INTO users (
  id,
  email,
  password,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  'gest_' || gen_random_uuid()::text,  -- Generate unique ID
  'gestionnaire@signature8.com',
  '$2a$10$YourBcryptHashedPasswordHere',  -- Replace with actual bcrypt hash
  'Marie Dupont',
  'Gestionnaire',
  NOW(),
  NOW()
);

-- ============================================
-- Option 2: Update an existing user to Gestionnaire
-- ============================================
-- Replace 'user@example.com' with the actual email

UPDATE users 
SET 
  role = 'Gestionnaire',
  updated_at = NOW()
WHERE email = 'user@example.com';

-- ============================================
-- Option 3: Create multiple Gestionnaire users
-- ============================================

INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES
  ('gest_001', 'marie.dupont@signature8.com', '$2a$10$YourHashHere', 'Marie Dupont', 'Gestionnaire', NOW(), NOW()),
  ('gest_002', 'ahmed.benali@signature8.com', '$2a$10$YourHashHere', 'Ahmed Benali', 'Gestionnaire', NOW(), NOW()),
  ('gest_003', 'fatima.zahra@signature8.com', '$2a$10$YourHashHere', 'Fatima Zahra', 'Gestionnaire', NOW(), NOW());

-- ============================================
-- Verify the users were created
-- ============================================

SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE role = 'Gestionnaire'
ORDER BY created_at DESC;

-- ============================================
-- Check all roles in the system
-- ============================================

SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
