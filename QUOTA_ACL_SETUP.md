# Automatic Quota and ACL Setup

This document explains the automatic quota assignment and ACL (Access Control List) setup that occurs when a new user is registered.

## Features

### Automatic Quota Assignment
- **Default Quota**: Every new user automatically receives **10 GB** of storage quota
- **Automatic Creation**: Quota is created in the database when user registers
- **Quota Enforcement**: File uploads are checked against quota limits
- **Quota Tracking**: Used storage is automatically tracked and updated

### Automatic ACL Setup
- **User-Specific Directories**: Each user gets their own storage directory
- **Directory Structure**: `{UPLOAD_DIR}/user_{id}_{username}/`
- **Cross-Platform Support**: Works on Linux, Windows, and macOS
  - **Linux**: Uses `setfacl` if available, falls back to `chmod 700`
  - **Windows**: Uses Windows ACL APIs if `pywin32` is installed, otherwise uses default permissions
  - **macOS**: Uses `chmod 700`
- **Permissions**: Directories are created with appropriate permissions for each platform

## How It Works

### User Registration Flow

1. **User Registration**
   ```python
   POST /auth/register
   {
     "username": "john_doe",
     "email": "john@example.com",
     "password": "SecurePass123",
     "role": "user"
   }
   ```

2. **Automatic Processes**:
   - User record created in database
   - **Quota record created** with 10GB limit
   - **User directory created** at `{UPLOAD_DIR}/user_{id}_{username}/`
   - **ACL/permissions set** automatically

### Directory Structure

```
/var/storage/uploads/          (or your UPLOAD_DIR)
├── user_1_john_doe/
│   ├── 20240101_120000_file1.pdf
│   └── 20240101_120100_document.docx
├── user_2_jane_smith/
│   └── 20240101_130000_image.jpg
└── ...
```

## Quota Management

### Quota Checking
- Quota is checked **during file upload** (not before, to handle streaming)
- Checks occur periodically (every 10MB) to balance performance and early failure
- If quota would be exceeded, upload is rejected with HTTP 413 error

### Quota Updates
- **On Upload**: Quota usage increases by file size
- **On Delete**: Quota usage decreases by file size
- **Automatic**: No manual intervention needed

### Quota Information
You can check user quota via the stats endpoint:
```bash
GET /files/stats
```

Response includes:
```json
{
  "user_storage": {
    "total_files": 5,
    "total_size": {"value": 2.5, "unit": "GB", "formatted": "2.5 GB"},
    "total_size_bytes": 2684354560
  },
  "disk_usage": {...}
}
```

## ACL Configuration

### Linux (with setfacl)
If `setfacl` is available on Linux:
```bash
setfacl -m u:username:rwx /var/storage/uploads/user_1_username
setfacl -m g::---,o::--- /var/storage/uploads/user_1_username
```

### Linux (fallback)
If `setfacl` is not available:
```bash
chmod 700 /var/storage/uploads/user_1_username
```

### Windows
On Windows, basic directory permissions are set. The application user should have access.

## Configuration

### Default Quota Size
The default quota is set in `app/services/quota_service.py`:
```python
DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB
```

To change the default quota, modify this constant.

### Custom Quota per User
To set custom quotas for specific users, you can manually update the database:
```sql
UPDATE user_quotas 
SET max_storage_size = 50 * 1024 * 1024 * 1024  -- 50 GB
WHERE user_id = 1;
```

Or create an admin endpoint to manage quotas.

## Error Handling

### Quota Exceeded
When a user tries to upload a file that would exceed their quota:
```json
{
  "detail": "Quota exceeded. You have 10.00 GB quota, currently using 9.50 GB. This file (1.00 GB) would exceed your quota."
}
```
HTTP Status: `413 Request Entity Too Large`

### Directory Creation Failure
If directory creation fails:
- Error is logged
- User registration continues (directory can be created manually later)
- Quota is still created

### ACL Setup Failure
If ACL setup fails:
- Error is logged
- Directory is still created with basic permissions
- User registration continues

## Manual Setup (if needed)

If automatic setup fails, you can manually create user directories:

```bash
# Create user directory
sudo mkdir -p /var/storage/uploads/user_1_username
sudo chown appuser:appuser /var/storage/uploads/user_1_username
sudo chmod 700 /var/storage/uploads/user_1_username

# Set ACL (Linux)
sudo setfacl -m u:username:rwx /var/storage/uploads/user_1_username
sudo setfacl -m g::---,o::--- /var/storage/uploads/user_1_username
```

## Monitoring

### Check User Quotas
```sql
SELECT 
    u.username,
    u.email,
    q.max_storage_size / (1024^3) as quota_gb,
    q.used_storage_size / (1024^3) as used_gb,
    (q.max_storage_size - q.used_storage_size) / (1024^3) as remaining_gb
FROM users u
JOIN user_quotas q ON u.id = q.user_id;
```

### Check Directory Permissions
```bash
# List user directories
ls -la /var/storage/uploads/

# Check ACL (if setfacl was used)
getfacl /var/storage/uploads/user_1_username
```

## Best Practices

1. **Regular Monitoring**: Monitor quota usage to identify users approaching limits
2. **Quota Alerts**: Consider implementing alerts when users reach 80% of quota
3. **Quota Increases**: Have a process for increasing quotas for users who need more
4. **Backup**: Ensure user directories are included in backup strategies
5. **Cleanup**: Periodically clean up orphaned files and update quota accordingly

## Troubleshooting

### Quota Not Created
- Check database connection
- Verify user registration completed successfully
- Check application logs for errors

### Directory Not Created
- **All Platforms**: Check UPLOAD_DIR path is correct
- **All Platforms**: Verify write permissions on base directory
- **All Platforms**: Check application logs for permission errors
- Directory creation works on Linux, Windows, and macOS

### ACL Not Set

#### Linux
- Verify `setfacl` is installed: `which setfacl`
  - Install: `sudo apt-get install acl` (Debian/Ubuntu) or `sudo yum install acl` (RHEL/CentOS)
- Check if running as root/sudo (may be needed for ACL)
- System automatically falls back to `chmod 700` if `setfacl` is not available
- Directory will still work with basic chmod permissions

#### Windows
- **Optional**: Install `pywin32` for explicit ACL control: `pip install pywin32`
- Without `pywin32`: System uses default Windows permissions (still functional)
- Directory inherits permissions from parent directory
- Application user has access since they created the directory

#### macOS
- Uses `chmod 700` (Unix-style permissions)
- Works similar to Linux

### Quota Not Enforced
- Verify quota records exist in database
- Check that quota checking code is running
- Review upload endpoint logs

## Cross-Platform Support

✅ **Directory Creation**: Works on ALL platforms (Linux, Windows, macOS)  
✅ **Linux ACL**: Full support with setfacl/chmod  
✅ **Windows ACL**: Full support with pywin32 (optional, works without it too)  
✅ **macOS ACL**: Full support with chmod  

For detailed cross-platform information, see `CROSS_PLATFORM_SUPPORT.md`.

## API Response Example

When a user registers successfully:
```json
{
  "message": "User created successfully!",
  "user_id": 1,
  "quota_gb": 10.0,
  "storage_setup": "completed"
}
```
