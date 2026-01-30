import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { useToast } from './ToastContext'

const UploadContext = createContext()

export const useUpload = () => {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider')
  }
  return context
}

export function UploadProvider({ children }) {
  const toast = useToast()
  const [uploads, setUploads] = useState(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem('active_uploads')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save to localStorage whenever uploads change
  useEffect(() => {
    try {
      localStorage.setItem('active_uploads', JSON.stringify(uploads))
    } catch (err) {
      console.error('Failed to save uploads to localStorage:', err)
    }
  }, [uploads])

  const addUpload = useCallback((uploadId, filename, file) => {
    setUploads(prev => {
      const exists = prev.find(u => u.id === uploadId)
      if (exists) return prev
      return [...prev, {
        id: uploadId,
        filename,
        progress: 0,
        status: 'uploading', // 'uploading' | 'completed' | 'error'
        error: null,
        fileSize: file.size,
        startTime: Date.now()
      }]
    })
  }, [])

  const updateUpload = useCallback((uploadId, updates) => {
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, ...updates } : u
    ))
  }, [])

  const removeUpload = useCallback((uploadId) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId))
  }, [])

  const uploadFile = useCallback(async (file, onComplete) => {
    if (!file) return

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    addUpload(uploadId, file.name, file)

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Let the browser/XHR handle large bodies; we don't want axios timeouts here
        timeout: 0, // No timeout for large files
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0
          updateUpload(uploadId, { progress: pct })
        },
      })

      updateUpload(uploadId, { 
        status: 'completed', 
        progress: 100 
      })
      
      // Remove completed upload after 3 seconds
      setTimeout(() => {
        removeUpload(uploadId)
      }, 3000)

      if (onComplete) onComplete()
      return true
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed'
      updateUpload(uploadId, { 
        status: 'error', 
        error: msg 
      })
      toast.error(msg)
      
      // Remove failed upload after 5 seconds
      setTimeout(() => {
        removeUpload(uploadId)
      }, 5000)

      throw new Error(msg)
    }
  }, [addUpload, updateUpload, removeUpload])

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status === 'uploading'))
  }, [])

  const value = {
    uploads,
    uploadFile,
    addUpload,
    updateUpload,
    removeUpload,
    clearCompleted,
  }

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  )
}
