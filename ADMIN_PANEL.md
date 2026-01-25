# Admin Panel Documentation

The admin panel provides comprehensive user management capabilities for administrators.

## Features

### User Management
- ✅ **List All Users**: View all registered users with pagination and search
- ✅ **User Details**: View detailed information about each user
- ✅ **Update Quota**: Change user's storage quota
- ✅ **Change Role**: Promote users to admin or demote admins to regular users
- ✅ **Reset Password**: Reset any user's password
- ✅ **Delete User**: Delete users and all their files

### Statistics Dashboard
- Total users count
- Admin count
- Total files count
- Total storage used
- Disk usage information

## Access Control

### Admin Role Required
All admin endpoints require the user to have the `admin` role. Regular users will receive a `403 Forbidden` error if they try to access admin endpoints.

### Role Checking
The system automatically checks user roles using the `require_admin()` helper function in `app/services/admin_service.py`.

## API Endpoints

### Get Admin Statistics
```http
GET /admin/stats
```

**Response:**
```json
{
  "users": {
    "total": 50,
    "admins": 2,
    "regular_users": 48
  },
  "files": {
    "total": 1250
  },
  "storage": {
    "total_used": {"value": 250.5, "unit": "GB", "formatted": "250.5 GB"},
    "total_used_bytes": 268435456000,
    "total_quota_allocated": {"value": 500.0, "unit": "GB", "formatted": "500.0 GB"},
    "total_quota_allocated_bytes": 536870912000
  },
  "disk": {
    "total": {"value": 1000.0, "unit": "GB", "formatted": "1000.0 GB"},
    "used": {"value": 300.0, "unit": "GB", "formatted": "300.0 GB"},
    "free": {"value": 700.0, "unit": "GB", "formatted": "700.0 GB"}
  }
}
```

### List Users
```http
GET /admin/users?skip=0&limit=100&search=john
```

**Query Parameters:**
- `skip` (optional): Number of users to skip (default: 0)
- `limit` (optional): Maximum number of users to return (default: 100, max: 1000)
- `search` (optional): Search by username or email

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2024-01-01T00:00:00",
      "quota": {
        "max_storage_gb": 10.0,
        "used_storage_gb": 2.5,
        "max_storage_bytes": 10737418240,
        "used_storage_bytes": 2684354560
      },
      "file_count": 15
    }
  ],
  "total": 50,
  "skip": 0,
  "limit": 100
}
```

### Get User Details
```http
GET /admin/users/{user_id}
```

**Response:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00",
  "quota": {
    "max_storage_gb": 10.0,
    "used_storage_gb": 2.5,
    "max_storage_bytes": 10737418240,
    "used_storage_bytes": 2684354560
  },
  "files": {
    "count": 15,
    "total_size_gb": 2.5,
    "total_size_bytes": 2684354560
  }
}
```

### Update User Quota
```http
PATCH /admin/users/{user_id}/quota
Content-Type: application/json

{
  "quota_gb": 50.0
}
```

**Response:**
```json
{
  "message": "Quota updated successfully",
  "user_id": 1,
  "new_quota_gb": 50.0,
  "new_quota_bytes": 53687091200
}
```

### Update User Role
```http
PATCH /admin/users/{user_id}/role
Content-Type: application/json

{
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "User role updated successfully",
  "user_id": 1,
  "old_role": "user",
  "new_role": "admin"
}
```

### Reset User Password
```http
POST /admin/users/{user_id}/reset-password
Content-Type: application/json

{
  "new_password": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully",
  "user_id": 1,
  "username": "john_doe"
}
```

### Delete User
```http
DELETE /admin/users/{user_id}
```

**Response:**
```json
{
  "message": "User deleted successfully",
  "user_id": 1,
  "username": "john_doe",
  "deleted_files": 15
}
```

**Note:** Deleting a user will:
- Delete all user's files from disk
- Delete user's storage directory
- Delete user's quota record
- Delete user record from database (cascade deletes files from DB)

## Frontend Admin Panel

### Access
The admin panel is accessible from the main dashboard. It appears as an "Admin" tab in the navigation, but only for users with the `admin` role.

### Features

1. **Statistics Cards**
   - Total users
   - Admin count
   - Total files
   - Storage used

2. **User Search**
   - Search by username or email
   - Real-time filtering

3. **User Table**
   - Displays all users with:
     - Username and email
     - Role badge
     - Quota information
     - File count
     - Creation date
   - Action buttons for each user

4. **User Actions**
   - **Update Quota**: Modal to change storage quota
   - **Change Role**: Modal to promote/demote users
   - **Reset Password**: Modal to reset user password
   - **Delete User**: Confirmation dialog before deletion

### Modals

#### Update Quota Modal
- Input field for quota in GB
- Validates quota > 0
- Updates quota immediately

#### Change Role Modal
- Dropdown to select role (user/admin)
- Updates role immediately

#### Reset Password Modal
- Password input field
- Validates minimum 8 characters
- Resets password immediately

## Security Considerations

### Self-Protection
- Admins cannot delete their own account
- This prevents accidental lockout

### Role Validation
- All admin endpoints validate the user's role
- Returns `403 Forbidden` if user is not an admin

### Password Requirements
- Password reset requires minimum 8 characters
- Follows same validation as user registration

## Usage Examples

### Promote User to Admin
```bash
curl -X PATCH "http://localhost:8000/admin/users/1/role" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Increase User Quota
```bash
curl -X PATCH "http://localhost:8000/admin/users/1/quota" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quota_gb": 100.0}'
```

### Search Users
```bash
curl -X GET "http://localhost:8000/admin/users?search=john" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Best Practices

1. **Regular Monitoring**: Check admin stats regularly to monitor system usage
2. **Quota Management**: Review and adjust quotas based on user needs
3. **Role Management**: Be careful when promoting users to admin
4. **User Deletion**: Always confirm before deleting users as it's irreversible
5. **Password Resets**: Communicate password resets to users securely

## Troubleshooting

### Cannot Access Admin Panel
- Verify user has `admin` role in database
- Check authentication token is valid
- Verify user info is loaded in frontend

### Admin Endpoints Return 403
- Check user role is set to "admin"
- Verify token is being sent correctly
- Check middleware is not blocking the request

### User Deletion Fails
- Check file permissions on user directory
- Verify user exists in database
- Check for foreign key constraints

## Database Queries

### Check User Role
```sql
SELECT id, username, email, role FROM users WHERE id = 1;
```

### Update User Role
```sql
UPDATE users SET role = 'admin' WHERE id = 1;
```

### Check All Admins
```sql
SELECT id, username, email FROM users WHERE role = 'admin';
```
