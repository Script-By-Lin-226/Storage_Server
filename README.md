# Storage Server

A modern file storage server with a React dashboard for managing files and viewing storage statistics.

## Features

### Backend
- 🔐 **Authentication**: JWT-based authentication system
- 📁 **File CRUD Operations**: Upload, download, list, rename, and delete files
- ⚡ **Optimized Performance**: Enhanced upload/download speed with optimized chunking (8MB upload, 10MB download chunks)
- 📊 **Storage Statistics**: Directory usage, free space percentage, and file type distribution
- 🔒 **Security**: User-based file access control
- 🔐 **File encryption at rest**: Optional Fernet (AES) encryption for uploaded files via `ENCRYPTION_KEY`
- 🗄️ **Database**: PostgreSQL with SQLAlchemy async support
- ⚙️ **Redis**: Caching support
- 🐧 **Linux/LVM Compatible**: Configurable storage paths for Linux LVM integration
- 🔄 **Auto-refresh**: Automatic file list and stats refresh after operations
- 💾 **Automatic Quota Management**: 10GB quota automatically assigned to new users
- 🔐 **Automatic ACL Setup**: User-specific directories with proper permissions created automatically

### Frontend
- 🎨 **Modern UI**: Clean and professional React dashboard with Tailwind CSS and Plus Jakarta Sans
- 🌙 **Dark mode**: Toggle with persistence and system preference detection
- 📬 **Toasts**: Success and error notifications for actions
- 📤 **Drag-and-drop upload**: Drop files onto the file area to upload
- 📋 **Sortable file list**: Sort by name, size, or date (asc/desc)
- 📈 **Real-time Stats**: Visual charts showing disk usage and file distribution
- 🔍 **File Search**: Quick search functionality
- 📤 **Upload Progress**: Real-time upload progress indicator
- 🎯 **File Management**: Intuitive interface for all file operations
- 🔄 **Auto-refresh**: Files list and statistics automatically refresh after upload, delete, or rename

## Project Structure

```
server_storage/
├── app/
│   ├── core/              # Core configurations and database
│   ├── middleware/        # Authentication middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── schemas/           # Pydantic schemas
│   ├── security/          # JWT and password security
│   └── services/          # Business logic
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   └── context/       # React context
│   └── ...
├── migration/             # Database migrations
└── main.py                # Application entry point
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis (optional)

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (create a `.env` file):
```env
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
ACCESS_TOKEN_EXP=30
REFRESH_TOKEN_EXP=7
ALGORITHM=HS256
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
# Optional: encrypt file contents at rest (Fernet). Generate key with:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# ENCRYPTION_KEY=your-base64url-32-byte-key
```

3. Run database migrations:
```bash
alembic upgrade head
```

4. Start the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token

### Files
- `GET /files/list` - List all files (with pagination)
- `POST /files/upload` - Upload a file
- `GET /files/{id}` - Get file information
- `GET /files/{id}/download` - Download a file
- `PATCH /files/{id}/rename` - Rename a file
- `DELETE /files/{id}` - Delete a file
- `GET /files/stats` - Get storage statistics

## Features in Detail

### Enhanced File Upload/Download
- **Optimized Chunking**: 8MB chunks for uploads, 10MB for downloads
- **Progress Tracking**: Real-time upload progress
- **Error Handling**: Comprehensive error handling and cleanup

### Dashboard Statistics
- **Disk Usage**: Total, used, and free space with percentages
- **File Distribution**: Visual pie chart of file types
- **User Storage**: Total files and storage used per user
- **Real-time Updates**: Statistics refresh every 30 seconds

### File Management
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- **Search**: Filter files by name
- **Inline Editing**: Rename files directly in the table
- **Bulk Operations**: Easy file management interface

## Technologies Used

### Backend
- FastAPI - Modern Python web framework
- SQLAlchemy - ORM with async support
- PostgreSQL - Database
- Redis - Caching
- Alembic - Database migrations
- JWT - Authentication

### Frontend
- React 18 - UI library
- React Router - Routing
- Axios - HTTP client
- Tailwind CSS - Styling
- Recharts - Data visualization
- Vite - Build tool

## Development

### Running in Development Mode

Backend:
```bash
python main.py
```

Frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

## Configuration

### Upload Directory
The upload directory is configurable via environment variable `UPLOAD_DIR` in your `.env` file:

```env
# Linux/LVM example
UPLOAD_DIR=/mnt/lvm-storage/uploads

# Or standard Linux path
UPLOAD_DIR=/var/storage/uploads

# Windows example
UPLOAD_DIR=D:\remote_storage\uploads
```

The system automatically creates the directory with proper permissions. For Linux LVM setup, see `LINUX_LVM_SETUP.md` for detailed instructions.

### Chunk Sizes
Upload and download chunk sizes can be adjusted in `app/services/file_service.py`:
```python
UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB
DOWNLOAD_CHUNK_SIZE = 10 * 1024 * 1024  # 10 MB
```

## Automatic Features

### User Registration Automation
When a new user registers, the system automatically:
- ✅ Assigns **10GB storage quota**
- ✅ Creates user-specific storage directory
- ✅ Sets up ACL/permissions (Linux: setfacl, fallback: chmod)
- ✅ Configures directory structure: `{UPLOAD_DIR}/user_{id}_{username}/`

### Quota Enforcement
- Quota is checked during file upload
- Uploads are rejected if quota would be exceeded
- Quota usage is automatically updated on upload/delete
- See `QUOTA_ACL_SETUP.md` for detailed information

## License

This project is open source and available under the MIT License.
