"""
Database Cleanup Script
Removes all data except user id = 1 and resets sequences.

WARNING: This script will permanently delete data!
Make sure you have a backup before running this script.
"""

import asyncio
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def cleanup_database():
    """Remove all data except user id = 1 and reset sequences."""
    
    # Create engine
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    
    try:
        async with engine.begin() as conn:
            print("=" * 60)
            print("DATABASE CLEANUP SCRIPT")
            print("=" * 60)
            print(f"Database: {settings.database_url.split('@')[-1] if '@' in settings.database_url else settings.database_url}")
            print()
            
            # Confirm before proceeding
            print("⚠️  WARNING: This will delete all data except user id = 1!")
            response = input("Type 'YES' to continue: ")
            if response != "YES":
                print("Operation cancelled.")
                return
            
            print("\nStarting cleanup...")
            
            # Step 1: Delete all files for users other than id = 1
            print("1. Deleting files for users other than id = 1...")
            result = await conn.execute(
                text("DELETE FROM files WHERE owner_id != 1")
            )
            print(f"   Deleted {result.rowcount} file records")
            
            # Step 2: Delete all user_quotas for users other than id = 1
            print("2. Deleting quotas for users other than id = 1...")
            result = await conn.execute(
                text("DELETE FROM user_quotas WHERE user_id != 1")
            )
            print(f"   Deleted {result.rowcount} quota records")
            
            # Step 3: Delete all premium_purchases for users other than id = 1
            print("3. Deleting premium purchases for users other than id = 1...")
            result = await conn.execute(
                text("DELETE FROM premium_purchases WHERE user_id != 1")
            )
            print(f"   Deleted {result.rowcount} premium purchase records")
            
            # Step 4: Delete all user_messages for users other than id = 1
            print("4. Deleting messages for users other than id = 1...")
            result = await conn.execute(
                text("DELETE FROM user_messages WHERE user_id != 1")
            )
            print(f"   Deleted {result.rowcount} message records")
            
            # Step 5: Delete all users except id = 1
            print("5. Deleting users except id = 1...")
            result = await conn.execute(
                text("DELETE FROM users WHERE id != 1")
            )
            print(f"   Deleted {result.rowcount} user records")
            
            # Step 6: Reset sequences
            print("\n6. Resetting sequences...")
            
            # Helper function to reset a sequence
            async def reset_sequence(conn, table_name, sequence_name):
                """Reset a sequence based on the max ID in the table."""
                try:
                    # Get max ID from table
                    result = await conn.execute(
                        text(f"SELECT COALESCE(MAX(id), 0) FROM {table_name}")
                    )
                    max_id = result.scalar() or 0
                    next_val = max_id + 1
                    
                    # Reset sequence
                    await conn.execute(
                        text(f"SELECT setval('{sequence_name}', {next_val}, false)")
                    )
                    print(f"   Reset {sequence_name} to {next_val}")
                    return True
                except Exception as e:
                    print(f"   ⚠️  Could not reset {sequence_name}: {e}")
                    return False
            
            # Reset all sequences
            await reset_sequence(conn, "users", "users_id_seq")
            await reset_sequence(conn, "files", "files_id_seq")
            await reset_sequence(conn, "user_quotas", "user_quotas_id_seq")
            await reset_sequence(conn, "premium_purchases", "premium_purchases_id_seq")
            await reset_sequence(conn, "user_messages", "user_messages_id_seq")
            
            print("\n" + "=" * 60)
            print("✅ Cleanup completed successfully!")
            print("=" * 60)
            
            # Verify results
            print("\nVerification:")
            result = await conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            print(f"   Users remaining: {user_count}")
            
            result = await conn.execute(text("SELECT COUNT(*) FROM files"))
            file_count = result.scalar()
            print(f"   Files remaining: {file_count}")
            
            result = await conn.execute(text("SELECT COUNT(*) FROM user_quotas"))
            quota_count = result.scalar()
            print(f"   Quotas remaining: {quota_count}")
            
            result = await conn.execute(text("SELECT COUNT(*) FROM premium_purchases"))
            purchase_count = result.scalar()
            print(f"   Premium purchases remaining: {purchase_count}")
            
            result = await conn.execute(text("SELECT COUNT(*) FROM user_messages"))
            message_count = result.scalar()
            print(f"   Messages remaining: {message_count}")
            
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup_database())
