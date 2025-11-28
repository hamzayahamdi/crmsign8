-- SQL Script to update a user's role to Gestionnaire de Projet
-- This script helps configure users with the Project Manager role

-- Example 1: Update an existing user by email
-- UPDATE users 
-- SET role = 'gestionnaire'
-- WHERE email = 'user@example.com';

-- Example 2: Update an existing user by name
-- UPDATE users 
-- SET role = 'gestionnaire'
-- WHERE name = 'User Name';

-- Example 3: Create a new Gestionnaire user
-- Note: You'll need to hash the password properly in your application
-- This is just an example structure
/*
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'gestionnaire@signature8.com',
  'HASHED_PASSWORD_HERE', -- Use proper password hashing!
  'Gestionnaire Test',
  'gestionnaire',
  NOW(),
  NOW()
);
*/

-- View current users and their roles
SELECT id, name, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- List all available roles
-- Valid roles: admin, operator, gestionnaire, architect, commercial, magasiner

-- Gestionnaire de Projet Permissions Summary:
-- ✓ Can view and manage Contacts
-- ✓ Can view and manage Clients & Opportunités  
-- ✓ Can view and manage their OWN Tasks (Tâches)
-- ✓ Can view and manage their OWN Calendar (Calendrier)
-- ✓ Can receive Notifications
-- ✗ CANNOT view Leads (Tableau des Leads)
-- ✗ CANNOT view Architectes
-- ✗ CANNOT view Users management
-- ✗ CANNOT access Settings












