# Storage Server Dashboard

A modern React dashboard for managing files and viewing storage statistics.

## Features

- 📁 **File Management**: Upload, download, rename, and delete files
- 📊 **Dashboard**: View directory usage, free space percentage, and file statistics
- 🎨 **Modern UI**: Clean and professional design with Tailwind CSS
- ⚡ **Fast Upload/Download**: Optimized chunking for better performance
- 🔍 **Search**: Quickly find files by name
- 📈 **Statistics**: Visual charts and detailed storage information

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend server running on `http://localhost:8000`

### Installation

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

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main dashboard component
│   │   ├── FileManager.jsx    # File management interface
│   │   ├── StatsPanel.jsx     # Statistics and charts
│   │   └── Login.jsx          # Login page
│   ├── context/
│   │   └── AuthContext.jsx    # Authentication context
│   ├── App.jsx                # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css              # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Features Overview

### File Management
- Upload files with progress indicator
- Download files
- Rename files inline
- Delete files with confirmation
- Search files by name
- View file details (size, upload date)

### Dashboard Statistics
- Total disk space and usage
- Free space percentage
- Your file count and total size
- File type distribution chart
- Real-time statistics updates

## API Integration

The frontend communicates with the backend API at `/api` (proxied to `http://localhost:8000`).

### Endpoints Used
- `POST /api/auth/login` - User authentication
- `GET /api/files/list` - List all files
- `POST /api/files/upload` - Upload file
- `GET /api/files/{id}/download` - Download file
- `PATCH /api/files/{id}/rename` - Rename file
- `DELETE /api/files/{id}` - Delete file
- `GET /api/files/stats` - Get storage statistics

## Technologies Used

- **React 18** - UI library
- **React Router** - Routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Recharts** - Charts and visualizations
- **Lucide React** - Icons
- **Vite** - Build tool
