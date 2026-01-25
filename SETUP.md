# Setup Guide

## Quick Start

### 1. Backend Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=postgresql+asyncpg://username:password@localhost/dbname
   ACCESS_TOKEN_EXP=30
   REFRESH_TOKEN_EXP=7
   ALGORITHM=HS256
   REDIS_URL=redis://localhost:6379
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Storage directory - configurable for Linux LVM or Windows
   # Linux example: /mnt/lvm-storage/uploads or /var/storage/uploads
   # Windows example: D:\remote_storage\uploads
   UPLOAD_DIR=/var/storage/uploads
   ```

3. **Create Upload Directory**
   The directory will be created automatically, but ensure the path is accessible:
   ```bash
   # Linux
   sudo mkdir -p /var/storage/uploads
   sudo chown -R youruser:youruser /var/storage/uploads
   sudo chmod -R 755 /var/storage/uploads
   
   # Windows
   # Create the directory manually or ensure the path exists
   ```
   
   **For Linux LVM setup**, see `LINUX_LVM_SETUP.md` for detailed instructions.

4. **Run Migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start Server**
   ```bash
   python main.py
   ```
   Server runs on `http://localhost:8000`

### 2. Frontend Setup

1. **Navigate to Frontend**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Dashboard runs on `http://localhost:3000`

## First Time Setup

### Create a User

You can register a user via the API:

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin123",
    "role": "admin"
  }'
```

Or use the frontend login page (if you add a register option).

## Troubleshooting

### Backend Issues

- **Database Connection Error**: Check your `DATABASE_URL` in `.env`
- **Port Already in Use**: Change port in `main.py` (default: 8000)
- **Upload Directory Error**: Ensure the upload directory path exists and is writable

### Frontend Issues

- **API Connection Error**: Ensure backend is running on port 8000
- **CORS Issues**: Backend CORS is configured to allow all origins
- **Build Errors**: Run `npm install` again to ensure all dependencies are installed

## Production Deployment

### Backend
1. Use a production ASGI server like Gunicorn with Uvicorn workers
2. Set proper environment variables
3. Use a reverse proxy (Nginx) for SSL/TLS
4. Configure proper CORS origins

### Frontend
1. Build the production bundle:
   ```bash
   cd frontend
   npm run build
   ```
2. Serve the `dist` folder with a web server (Nginx, Apache, etc.)
3. Configure API proxy to point to your backend server

## Features Checklist

✅ File Upload with progress tracking
✅ File Download with optimized chunking
✅ File List with pagination
✅ File Rename
✅ File Delete
✅ Search functionality
✅ Storage statistics dashboard
✅ Disk usage visualization
✅ File type distribution charts
✅ Real-time statistics updates
✅ User authentication
✅ Clean, professional UI
