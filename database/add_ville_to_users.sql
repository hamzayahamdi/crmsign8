-- Add ville column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ville TEXT;

-- Update existing architect users with correct names and cities
-- Based on the requirements:
-- Karima Laroussi => MARRAKECH
-- Israe Abdallas => Tanger  
-- Sanae Lamrani => Rabat
-- Amina Tazi => Casablanca
-- Hiba Lagsissi => Casablanca

-- Fix name: "Israe Israe" should be "Sanae Lamrani"
UPDATE users 
SET name = 'Sanae Lamrani', ville = 'Rabat'
WHERE name LIKE '%Israe Israe%' OR (name LIKE '%Israe%' AND name LIKE '%Israe%');

-- Update Karima to MARRAKECH
UPDATE users 
SET ville = 'MARRAKECH'
WHERE name LIKE '%Karima%' AND role = 'architect';

-- Update Israe Abdallas to Tanger
UPDATE users 
SET ville = 'Tanger'
WHERE name LIKE '%Israe%' AND name LIKE '%Abdallas%' AND role = 'architect';

-- Update Sanae Lamrani to Rabat
UPDATE users 
SET ville = 'Rabat'
WHERE name LIKE '%Sanae%' AND name LIKE '%Lamrani%' AND role = 'architect';

-- Update Amina Tazi to Casablanca
UPDATE users 
SET ville = 'Casablanca'
WHERE name LIKE '%Amina%' AND name LIKE '%Tazi%' AND role = 'architect';

-- Update Hiba Lagsissi to Casablanca
UPDATE users 
SET ville = 'Casablanca'
WHERE (name LIKE '%Hiba%' AND name LIKE '%Lagsissi%') OR (name LIKE '%Hiba%' AND name LIKE '%Lagsiss%') AND role = 'architect';

-- Verify the changes
SELECT id, name, ville, role, email
FROM users
WHERE role = 'architect'
ORDER BY name;



