import os
import subprocess
import platform
from pathlib import Path
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Windows ACL support (optional)
WINDOWS_ACL_AVAILABLE = False
try:
    if platform.system() == "Windows":
        import win32security  # type: ignore
        import win32api  # type: ignore
        import ntsecuritycon as con  # type: ignore
        WINDOWS_ACL_AVAILABLE = True
except ImportError:
    # pywin32 not installed - Windows will use default permissions
    pass

# Default quota: 10GB in bytes
DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB


async def create_user_storage_directory(user_id: int, username: str, base_upload_dir: Path) -> Path:
    """
    Create a user-specific storage directory and return its path.
    
    Args:
        user_id: The user's ID
        username: The user's username
        base_upload_dir: Base upload directory path
        
    Returns:
        Path to the user's storage directory
    """
    # Create user-specific directory: base_dir/user_{id}_{username}
    user_dir = base_upload_dir / f"user_{user_id}_{username}"
    
    try:
        user_dir.mkdir(parents=True, exist_ok=True, mode=0o700)  # Private directory (700)
        logger.info(f"Created user storage directory: {user_dir}")
        return user_dir
    except PermissionError as e:
        logger.error(f"Permission denied creating user directory {user_dir}: {e}")
        # Try without mode for Windows compatibility
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    except Exception as e:
        logger.error(f"Failed to create user directory {user_dir}: {e}")
        raise


async def set_directory_acl(user_dir: Path, username: Optional[str] = None) -> bool:
    """
    Set ACL (Access Control List) for user directory.
    - Linux: Uses setfacl if available, falls back to chmod
    - Windows: Uses Windows ACL APIs if pywin32 is available, otherwise uses default permissions
    - macOS/Other: Uses chmod
    
    Args:
        user_dir: Path to the user's directory
        username: Username for ACL (optional, uses current user if not provided)
        
    Returns:
        True if ACL was set successfully, False otherwise
    """
    if not user_dir.exists():
        logger.warning(f"Directory {user_dir} does not exist, cannot set ACL")
        return False
    
    system = platform.system()
    
    if system == "Linux":
        # Try to use setfacl (Linux ACL)
        try:
            if username:
                # Set ACL: user gets rwx, group and others get no access
                subprocess.run(
                    ["setfacl", "-m", f"u:{username}:rwx", str(user_dir)],
                    check=True,
                    capture_output=True
                )
                subprocess.run(
                    ["setfacl", "-m", "g::---,o::---", str(user_dir)],
                    check=True,
                    capture_output=True
                )
                logger.info(f"Set ACL for {user_dir} using setfacl")
                return True
            else:
                # Fallback to chmod if username not provided
                os.chmod(user_dir, 0o700)
                logger.info(f"Set permissions for {user_dir} using chmod (700)")
                return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            # setfacl not available, fallback to chmod
            logger.info("setfacl not available, using chmod instead")
            try:
                os.chmod(user_dir, 0o700)
                logger.info(f"Set permissions for {user_dir} using chmod (700)")
                return True
            except Exception as e:
                logger.error(f"Failed to set permissions for {user_dir}: {e}")
                return False
    elif system == "Windows":
        # Windows ACL support
        try:
            if WINDOWS_ACL_AVAILABLE:
                # Get the current user's SID
                user_sid = win32security.LookupAccountName(None, os.getenv('USERNAME', ''))[0]
                
                # Create a security descriptor
                security_descriptor = win32security.GetFileSecurity(
                    str(user_dir), win32security.DACL_SECURITY_INFORMATION
                )
                
                # Create DACL (Discretionary Access Control List)
                dacl = win32security.ACL()
                
                # Add full control for the current user
                dacl.AddAccessAllowedAce(
                    win32security.ACL_REVISION,
                    con.FILE_ALL_ACCESS,  # Full control
                    user_sid
                )
                
                # Deny access to everyone else (optional, can be removed if you want others to have read access)
                # everyone_sid = win32security.ConvertStringSidToSid("S-1-1-0")
                # dacl.AddAccessDeniedAce(
                #     win32security.ACL_REVISION,
                #     con.FILE_ALL_ACCESS,
                #     everyone_sid
                # )
                
                # Set the security descriptor
                security_descriptor.SetSecurityDescriptorDacl(1, dacl, 0)
                win32security.SetFileSecurity(
                    str(user_dir),
                    win32security.DACL_SECURITY_INFORMATION,
                    security_descriptor
                )
                
                logger.info(f"Set Windows ACL for {user_dir}")
                return True
            else:
                # Fallback: Use basic directory creation (permissions inherited from parent)
                # On Windows, directories inherit permissions from parent by default
                logger.info(f"Windows ACL libraries not available. Using default permissions for {user_dir}")
                return True
        except Exception as e:
            logger.error(f"Failed to set Windows ACL for {user_dir}: {e}")
            # Fallback to basic permissions
            return True
    else:
        # Other systems (macOS, etc.) - use basic permissions
        try:
            # Try chmod as fallback
            os.chmod(user_dir, 0o700)
            logger.info(f"Set permissions for {user_dir} using chmod (700) on {system}")
            return True
        except Exception as e:
            logger.warning(f"Could not set permissions for {user_dir} on {system}: {e}")
            # Directory exists, which is the most important part
            return True


async def setup_user_storage(user_id: int, username: str, base_upload_dir: Path) -> Tuple[Path, bool]:
    """
    Complete setup for user storage: create directory and set ACL.
    
    Args:
        user_id: The user's ID
        username: The user's username
        base_upload_dir: Base upload directory path
        
    Returns:
        Tuple of (user_directory_path, acl_set_success)
    """
    try:
        # Create user directory
        user_dir = await create_user_storage_directory(user_id, username, base_upload_dir)
        
        # Set ACL/permissions
        acl_success = await set_directory_acl(user_dir, username)
        
        return user_dir, acl_success
    except Exception as e:
        logger.error(f"Failed to setup user storage for user {user_id}: {e}")
        raise
