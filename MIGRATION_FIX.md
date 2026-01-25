# Database Migration Fix - Quota Columns

## Problem
The `user_quotas` table was using `INTEGER` type for `max_storage_size` and `used_storage_size` columns, which has a maximum value of 2,147,483,647 (about 2GB). When trying to set a 10GB quota (10,737,418,240 bytes), it exceeded this limit causing an error.

## Solution
Changed the column types from `INTEGER` to `BIGINT` which can store values up to 9,223,372,036,854,775,807 (about 9 exabytes).

## Changes Made

### 1. Database Model (`app/models/Database_Model.py`)
- Changed `max_storage_size` from `Integer` to `BigInteger`
- Changed `used_storage_size` from `Integer` to `BigInteger`

### 2. Migration File (`migration/versions/fa4f8a9a3687_change_quota_columns_to_bigint.py`)
- Added migration to alter existing columns from INTEGER to BIGINT

## How to Apply the Migration

### Option 1: Using Alembic (Recommended)
```bash
# From the project root directory
alembic upgrade head
```

### Option 2: Manual SQL (if Alembic doesn't work)
```sql
-- Connect to your PostgreSQL database and run:
ALTER TABLE user_quotas 
  ALTER COLUMN max_storage_size TYPE BIGINT,
  ALTER COLUMN used_storage_size TYPE BIGINT;
```

## Verification

After running the migration, verify the changes:
```sql
-- Check column types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_quotas' 
  AND column_name IN ('max_storage_size', 'used_storage_size');
```

Expected output:
```
column_name        | data_type
-------------------|----------
max_storage_size   | bigint
used_storage_size  | bigint
```

## Testing

After the migration, try registering a new user. The 10GB quota should now work without errors.

## Rollback (if needed)

If you need to rollback the migration:
```bash
alembic downgrade -1
```

**Note:** Rollback may fail if there are values larger than INTEGER max (2,147,483,647) in the database.
