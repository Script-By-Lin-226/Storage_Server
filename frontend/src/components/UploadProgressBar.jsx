import React from 'react'
import { useUpload } from '../context/UploadContext'
import { Upload, CheckCircle2, XCircle, X } from 'lucide-react'

function UploadProgressBar() {
  const { uploads, removeUpload, clearCompleted } = useUpload()
  const activeUploads = uploads.filter(u => u.status === 'uploading')
  const completedUploads = uploads.filter(u => u.status === 'completed')
  const failedUploads = uploads.filter(u => u.status === 'error')

  if (uploads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md w-full sm:w-96">
      {/* Active uploads */}
      {activeUploads.map(upload => (
        <div
          key={upload.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-slide-up"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {upload.filename}
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>{upload.progress}%</span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {upload.fileSize ? `${(upload.fileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => removeUpload(upload.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Completed uploads */}
      {completedUploads.map(upload => (
        <div
          key={upload.id}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-lg border border-green-200 dark:border-green-800 p-3 animate-slide-up"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-900 dark:text-green-100 truncate flex-1">
              {upload.filename} uploaded
            </p>
            <button
              onClick={() => removeUpload(upload.id)}
              className="flex-shrink-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Failed uploads */}
      {failedUploads.map(upload => (
        <div
          key={upload.id}
          className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-3 animate-slide-up"
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                {upload.filename}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                {upload.error || 'Upload failed'}
              </p>
            </div>
            <button
              onClick={() => removeUpload(upload.id)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Clear all button when there are completed/failed */}
      {(completedUploads.length > 0 || failedUploads.length > 0) && (
        <button
          onClick={clearCompleted}
          className="w-full text-xs text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 py-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default UploadProgressBar
