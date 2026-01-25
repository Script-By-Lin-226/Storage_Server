# Cross-Platform Support for Directory Creation and ACL

## Overview

The automatic directory creation and ACL setup works on **all platforms** (Linux, Windows, macOS), but with different levels of permission control depending on the operating system.

## Directory Creation

✅ **Works on ALL platforms:**
- **Linux**: Creates directory with mode 0o700 (owner read/write/execute only)
- **Windows**: Creates directory (Windows doesn't use Unix-style permissions, uses ACLs instead)
- **macOS**: Creates directory with mode 0o700

The directory is **always created** regardless of platform. The difference is in how permissions are set.

## ACL/Permission Setup

### Linux
- **Primary Method**: Uses `setfacl` command (if available)
  - Sets user-specific ACL: `u:username:rwx`
  - Denies group and others: `g::---,o::---`
- **Fallback**: Uses `chmod 700` if `setfacl` is not available
- **Result**: Full ACL control with user-specific permissions

### Windows
- **With pywin32** (optional): Uses Windows ACL APIs
  - Sets full control for the application user
  - Uses Windows Security Descriptors and DACL
  - Install: `pip install pywin32`
- **Without pywin32**: Uses default Windows permissions
  - Directory inherits permissions from parent directory
  - Application user has access (since they created it)
  - **Still functional**, just uses Windows default permissions

### macOS
- Uses `chmod 700` (Unix-style permissions)
- Works similar to Linux

## Installation

### For Full Windows ACL Support (Optional)

```bash
pip install pywin32
```

**Note**: This is optional. The system works without it, but with basic Windows permissions instead of explicit ACLs.

## How It Works

### Directory Creation Flow

1. **Always Creates Directory**: 
   ```python
   user_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
   ```
   - On Linux/macOS: Sets mode 0o700
   - On Windows: Mode parameter is ignored, but directory is created

2. **Sets Permissions**:
   - Platform detection using `platform.system()`
   - Platform-specific permission setting

### Platform Detection

```python
system = platform.system()
# Returns: "Linux", "Windows", "Darwin" (macOS), etc.
```

## Current Behavior by Platform

| Platform | Directory Created | ACL Set | Method |
|----------|------------------|---------|--------|
| Linux | ✅ Yes | ✅ Yes | setfacl or chmod |
| Windows (with pywin32) | ✅ Yes | ✅ Yes | Windows ACL APIs |
| Windows (without pywin32) | ✅ Yes | ⚠️ Basic | Default permissions |
| macOS | ✅ Yes | ✅ Yes | chmod |

## Security Considerations

### Linux
- Full ACL control
- User-specific permissions
- Group and others denied access

### Windows
- **With pywin32**: Explicit ACL control
- **Without pywin32**: Relies on:
  - Parent directory permissions
  - Application user context
  - Windows default security model

### Best Practice
For production Windows deployments, install `pywin32` for explicit ACL control:
```bash
pip install pywin32
```

## Troubleshooting

### Linux: "setfacl: command not found"
- **Solution**: Install ACL tools: `sudo apt-get install acl` (Debian/Ubuntu) or `sudo yum install acl` (RHEL/CentOS)
- **Fallback**: System automatically uses `chmod` instead

### Windows: ACL not set
- **Check**: Is `pywin32` installed? Run: `pip list | findstr pywin32`
- **Install**: `pip install pywin32`
- **Note**: System still works without it, just uses default permissions

### Permission Errors
- **Linux**: Ensure application runs with appropriate user permissions
- **Windows**: Ensure application has write access to parent directory
- **All**: Check parent directory permissions

## Code Flow

```python
# 1. Create directory (works on all platforms)
user_dir = create_user_storage_directory(user_id, username, base_dir)

# 2. Set ACL (platform-specific)
acl_success = set_directory_acl(user_dir, username)

# Result:
# - Directory always created ✅
# - ACL set if platform supports it ✅
# - System continues even if ACL setup fails (graceful degradation)
```

## Summary

✅ **Directory Creation**: Works on ALL platforms  
✅ **Linux ACL**: Full support with setfacl/chmod  
✅ **Windows ACL**: Full support with pywin32 (optional, works without it too)  
✅ **macOS ACL**: Full support with chmod  

The system is designed to work on all platforms, with the best possible permission control available on each platform.
