-- Database Cleanup SQL Script
-- Removes all data except user id = 1 and resets sequences.
--
-- WARNING: This script will permanently delete data!
-- Make sure you have a backup before running this script.
--
-- Usage:
--   psql -U your_user -d your_database -f cleanup_database.sql
--   Or run each command manually in psql

BEGIN;

-- Step 1: Delete all files for users other than id = 1
DELETE FROM files WHERE owner_id != 1;

-- Step 2: Delete all user_quotas for users other than id = 1
DELETE FROM user_quotas WHERE user_id != 1;

-- Step 3: Delete all premium_purchases for users other than id = 1
DELETE FROM premium_purchases WHERE user_id != 1;

-- Step 4: Delete all user_messages for users other than id = 1
DELETE FROM user_messages WHERE user_id != 1;

-- Step 5: Delete all users except id = 1
DELETE FROM users WHERE id != 1;

-- Step 6: Reset sequences
-- Users sequence
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);

-- Files sequence
SELECT setval('files_id_seq', COALESCE((SELECT MAX(id) FROM files), 0) + 1, false);

-- User quotas sequence
SELECT setval('user_quotas_id_seq', COALESCE((SELECT MAX(id) FROM user_quotas), 0) + 1, false);

-- Premium purchases sequence
SELECT setval('premium_purchases_id_seq', COALESCE((SELECT MAX(id) FROM premium_purchases), 0) + 1, false);

-- User messages sequence
SELECT setval('user_messages_id_seq', COALESCE((SELECT MAX(id) FROM user_messages), 0) + 1, false);

-- Verification queries (run these to verify)
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM files;
-- SELECT COUNT(*) FROM user_quotas;
-- SELECT COUNT(*) FROM premium_purchases;
-- SELECT COUNT(*) FROM user_messages;

COMMIT;
