import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useToast } from '../context/ToastContext'
import {
  Upload,
  Download,
  Trash2,
  Edit2,
  File,
  Search,
  RefreshCw,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

function FileRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-48" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-28" /></td>
      <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-24 ml-auto" /></td>
    </tr>
  )
}

function FileManager({ onFileChange }) {
  const toast = useToast()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'name' | 'date' | 'size'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = React.useRef(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/files/list?limit=1000')
      setFiles(response.data.files || [])
      setError('')
    } catch (err) {
      setError('Failed to load files')
      toast.error('Failed to load files')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const doUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      await axios.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0
          setUploadProgress(pct)
        },
      })
      toast.success('File uploaded successfully!')
      await fetchFiles()
      if (onFileChange) onFileChange()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    doUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && !file.type?.startsWith('text/html')) doUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`/files/${fileId}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (err) {
      setError('Failed to download file')
      toast.error('Failed to download file')
      console.error(err)
    }
  }

  const handleDelete = async (fileId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return
    setError('')
    try {
      await axios.delete(`/files/${fileId}`)
      toast.success('File deleted successfully!')
      await fetchFiles()
      if (onFileChange) onFileChange()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete file'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleRename = async (fileId) => {
    if (!editName.trim()) {
      setError('Filename cannot be empty')
      return
    }
    setError('')
    try {
      await axios.patch(`/files/${fileId}/rename`, { new_filename: editName })
      toast.success('File renamed successfully!')
      setEditingId(null)
      setEditName('')
      await fetchFiles()
      if (onFileChange) onFileChange()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to rename file'
      setError(msg)
      toast.error(msg)
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

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const filteredFiles = useMemo(() => {
    let list = files.filter((f) =>
      f.filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const mult = sortDir === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return mult * (a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' }))
      }
      if (sortBy === 'date') {
        return mult * (new Date(a.created_at || 0) - new Date(b.created_at || 0))
      }
      return mult * ((a.size_bytes || 0) - (b.size_bytes || 0))
    })
    return list
  }, [files, searchTerm, sortBy, sortDir])

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

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 opacity-50" />
    return sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
          dragOver ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : ''
        }`}
      >
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
            <div className="flex-1 w-full min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none text-base sm:text-sm"
                />
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <div className="grid grid-cols-2 sm:flex sm:flex-initial gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="touch-target inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition disabled:opacity-50 text-sm sm:text-base"
              >
                <Upload className="w-5 h-5 shrink-0" />
                <span className="truncate">Upload</span>
              </button>
              <button
                type="button"
                onClick={fetchFiles}
                disabled={loading}
                className="touch-target inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 text-sm sm:text-base"
              >
                <RefreshCw className={`w-5 h-5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Uploading...</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {dragOver && (
            <div className="mt-4 py-6 border-2 border-dashed border-primary-400 dark:border-primary-500 rounded-xl bg-primary-50/50 dark:bg-primary-900/20 text-center text-primary-700 dark:text-primary-300 font-medium">
              Drop file here to upload
            </div>
          )}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <>
            <div className="md:hidden flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16" />
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded</th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FileRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <File className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">
              {searchTerm ? 'No files match your search' : 'No files yet'}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try a different search term' : 'Upload a file or drop one here'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {editingId === file.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 text-base"
                          autoFocus
                        />
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">{file.filename}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{file.size} · {formatDate(file.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {editingId === file.id ? (
                        <>
                          <button type="button" onClick={() => handleRename(file.id)} className="touch-target flex items-center justify-center p-2.5 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30" title="Save"><Check className="w-5 h-5" /></button>
                          <button type="button" onClick={cancelEdit} className="touch-target flex items-center justify-center p-2.5 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30" title="Cancel"><X className="w-5 h-5" /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => handleDownload(file.id, file.filename)} className="touch-target flex items-center justify-center p-2.5 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30" title="Download"><Download className="w-5 h-5" /></button>
                          <button type="button" onClick={() => startEdit(file)} className="touch-target flex items-center justify-center p-2.5 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Rename"><Edit2 className="w-5 h-5" /></button>
                          <button type="button" onClick={() => handleDelete(file.id, file.filename)} className="touch-target flex items-center justify-center p-2.5 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete"><Trash2 className="w-5 h-5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                      File Name <SortIcon column="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('size')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                      Size <SortIcon column="size" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                      Uploaded <SortIcon column="date" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4">
                      {editingId === file.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <File className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">{file.filename}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{file.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(file.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      {editingId === file.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => handleRename(file.id)} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-1.5 rounded-lg" title="Save"><Check className="w-5 h-5" /></button>
                          <button type="button" onClick={cancelEdit} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg" title="Cancel"><X className="w-5 h-5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => handleDownload(file.id, file.filename)} className="text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 p-2 rounded-lg" title="Download"><Download className="w-5 h-5" /></button>
                          <button type="button" onClick={() => startEdit(file)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg" title="Rename"><Edit2 className="w-5 h-5" /></button>
                          <button type="button" onClick={() => handleDelete(file.id, file.filename)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg" title="Delete"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FileManager
