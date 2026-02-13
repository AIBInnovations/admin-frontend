import { useCallback, useState } from 'react'
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone'
import { UploadCloud, X, FileText, Image, Video, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept?: Accept
  maxFiles?: number
  maxSize?: number // in bytes
  value?: File[]
  onChange?: (files: File[]) => void
  disabled?: boolean
  className?: string
  label?: string
  description?: string
}

const fileTypeIcons: Record<string, typeof File> = {
  'image/': Image,
  'video/': Video,
  'application/pdf': FileText,
}

function getFileIcon(type: string) {
  for (const [prefix, Icon] of Object.entries(fileTypeIcons)) {
    if (type.startsWith(prefix)) return Icon
  }
  return File
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function FileUpload({
  accept,
  maxFiles = 1,
  maxSize = 50 * 1024 * 1024, // 50MB default
  value = [],
  onChange,
  disabled = false,
  className,
  label = 'Upload files',
  description,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0]
        setError(firstError.message)
        return
      }

      const newFiles = maxFiles === 1 ? acceptedFiles : [...value, ...acceptedFiles].slice(0, maxFiles)
      onChange?.(newFiles)
    },
    [value, onChange, maxFiles],
  )

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onChange?.(newFiles)
    setError(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
    multiple: maxFiles > 1,
  })

  const acceptedExtensions = accept
    ? Object.values(accept).flat().join(', ')
    : null

  return (
    <div className={cn('space-y-3', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-300 bg-red-50/50',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            isDragActive ? 'bg-primary/10' : 'bg-muted',
          )}>
            <UploadCloud className={cn(
              'h-6 w-6',
              isDragActive ? 'text-primary' : 'text-muted-foreground',
            )} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop files here' : label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {description || `Drag & drop or click to browse. Max ${formatBytes(maxSize)}.`}
            </p>
            {acceptedExtensions && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Accepted: {acceptedExtensions}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => {
            const FileIcon = getFileIcon(file.type)
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
