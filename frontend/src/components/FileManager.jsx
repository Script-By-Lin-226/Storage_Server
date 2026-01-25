import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Upload,
  Download,
  Trash2,
  Edit2,
  File,
  Search,
  RefreshCw,
  Check,
  X
} from 'lucide-react'

function FileManager({ onFileChange }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/files/list?limit=1000')
      setFiles(response.data.files || [])
    } catch (error) {
      setError('Failed to load files')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Create a custom axios instance for upload with progress
      const response = await axios.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
        },
      })

      setSuccess('File uploaded successfully!')
      
      // Immediately refresh files list
      await fetchFiles()
      
      // Refresh stats if callback provided
      if (onFileChange) {
        onFileChange()
      }
      
      // Reset file input
      e.target.value = ''
      
      setTimeout(() => {
        setSuccess('')
        setUploadProgress(0)
      }, 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      })

      // Create blob link and download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setError('Failed to download file')
      console.error(error)
    }
  }

  const handleDelete = async (fileId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await axios.delete(`/files/${fileId}`)
      setSuccess('File deleted successfully!')
      
      // Immediately refresh files list
      await fetchFiles()
      
      // Refresh stats if callback provided
      if (onFileChange) {
        onFileChange()
      }
      
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to delete file')
      console.error(error)
      setLoading(false)
    }
  }

  const handleRename = async (fileId) => {
    if (!editName.trim()) {
      setError('Filename cannot be empty')
      return
    }

    setError('')
    setSuccess('')

    try {
      await axios.patch(`/files/${fileId}/rename`, {
        new_filename: editName,
      })
      setSuccess('File renamed successfully!')
      setEditingId(null)
      setEditName('')
      
      // Immediately refresh files list
      await fetchFiles()
      
      // Refresh stats if callback provided
      if (onFileChange) {
        onFileChange()
      }
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to rename file')
    }
  }

  const startEdit = (file) => {
    setEditingId(file.id)
    setEditName(file.filename)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition">
              <Upload className="w-5 h-5 mr-2" />
              Upload File
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            <button
              onClick={fetchFiles}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Uploading...</span>
              <span className="text-sm font-medium text-primary-600">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No files found' : 'No files uploaded yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === file.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center">
                          <File className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {file.filename}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === file.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRename(file.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleDownload(file.id, file.filename)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => startEdit(file)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Rename"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id, file.filename)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileManager
