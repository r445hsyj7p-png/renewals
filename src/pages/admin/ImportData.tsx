import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRenewalStore } from '@/store/renewal.store'
import { XLSXService } from '@/services/xlsx.service'
import { RenewalService } from '@/services/renewal.service'
import { formatDate } from '@/lib/utils'
import type { UploadBatch } from '@/types/renewal.types'

interface UploadTask {
  id: string
  file: File
  status: 'pending' | 'parsing' | 'complete' | 'error'
  progress: number
  result?: { recordCount: number; duplicates: number }
  error?: string
}

export function ImportData() {
  const { records, addRecords, uploadBatches, removeBatch, clearAll } = useRenewalStore()
  const [tasks, setTasks] = React.useState<UploadTask[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)

  const updateTask = (id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const processFiles = async (files: File[]) => {
    const newTasks: UploadTask[] = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: 'pending' as const,
      progress: 0,
    }))
    setTasks(prev => [...prev, ...newTasks])
    setIsProcessing(true)

    for (const task of newTasks) {
      updateTask(task.id, { status: 'parsing', progress: 20 })
      try {
        await new Promise(r => setTimeout(r, 200))
        updateTask(task.id, { progress: 50 })
        const result = await XLSXService.parseFile(task.file, records)
        updateTask(task.id, { progress: 80 })

        const enriched = RenewalService.enrichRecords(
          result.records.map(r => ({ ...r, uploadBatchId: result.batch.id }))
        )
        addRecords(enriched, result.batch)
        updateTask(task.id, {
          status: 'complete',
          progress: 100,
          result: { recordCount: result.records.length, duplicates: result.duplicates },
        })
        toast.success(`Imported ${result.records.length} records from ${task.file.name}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        updateTask(task.id, { status: 'error', progress: 0, error: msg })
        toast.error(`Failed to import ${task.file.name}: ${msg}`)
      }
    }
    setIsProcessing(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    onDrop: processFiles,
    disabled: isProcessing,
  })

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload XLSX files with renewal data</p>
        </div>
        {records.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Clear all imported data?')) {
                clearAll()
                setTasks([])
                toast.info('All data cleared')
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear All Data
          </Button>
        )}
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Records', value: records.length },
            { label: 'Upload Batches', value: uploadBatches.length },
            { label: 'Unique Customers', value: new Set(records.map(r => r.endCustomerName)).size },
            { label: 'Products', value: new Set(records.map(r => r.productCode)).size },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {isProcessing ? (
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              ) : (
                <Upload className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">
                {isDragActive ? 'Drop files here' : 'Drag & drop XLSX files'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse • .xlsx and .xls supported</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {['ASCNAME', 'ENDCUSTOMERNAME', 'PRODUCTCODE', 'EXPIRATIONDATE', 'THEATRE', 'COUNTRY'].map(col => (
                <code key={col} className="rounded bg-muted px-1.5 py-0.5 font-mono">{col}</code>
              ))}
              <span className="text-muted-foreground">+ 18 more columns</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Upload Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(task.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'parsing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {task.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {task.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {task.status !== 'parsing' && (
                      <button onClick={() => removeTask(task.id)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {task.status === 'parsing' && (
                  <div className="mt-2">
                    <Progress value={task.progress} className="h-1" />
                  </div>
                )}
                {task.status === 'complete' && task.result && (
                  <div className="mt-2 flex gap-2">
                    <Badge variant="success">{task.result.recordCount} records</Badge>
                    {task.result.duplicates > 0 && (
                      <Badge variant="medium">{task.result.duplicates} duplicates</Badge>
                    )}
                  </div>
                )}
                {task.status === 'error' && (
                  <p className="mt-2 text-xs text-red-500">{task.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      {uploadBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Upload History</CardTitle>
            <CardDescription className="text-xs">{uploadBatches.length} batches imported</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {uploadBatches.map(batch => (
                <BatchRow key={batch.id} batch={batch} onRemove={removeBatch} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expected Columns Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Expected XLSX Columns</CardTitle>
          <CardDescription className="text-xs">Your file should contain these column headers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
              'ASCNAME', 'ASCID', 'ATRSTATUS', 'INQTRPULLINPUSHOUTQUARTER',
              'RENEWEDSUPPORTTYPE', 'SAMESAPASC', 'EXPIREDFISCALQTR', 'RENEWEDFISCALQTR',
              'AUTHCODE', 'PRODUCTCODE', 'RENEWEDPRODUCTCODE', 'TARGETQTY',
              'RENEWEDQTY', 'REPORTINGFISCALQTR', 'COUNTRY', 'THEATRE',
              'EXPIRATIONDATE', 'ENDCUSTOMERNAME', 'ENDCUSTOMERCOUNTRY', 'DISTINAME',
              'RESELNAME', 'SERIALNUMBER', 'selling_entity', 'PRODUCTGROUP',
            ].map(col => (
              <code key={col} className="rounded bg-muted px-2 py-1 font-mono text-xs truncate">
                {col}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BatchRow({ batch, onRemove }: { batch: UploadBatch; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
      <FileSpreadsheet className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{batch.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(batch.uploadedAt)} • {(batch.fileSize / 1024).toFixed(1)} KB
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={batch.status === 'complete' ? 'success' : batch.status === 'error' ? 'critical' : 'info'}>
          {batch.recordCount} records
        </Badge>
        {(batch.duplicatesFound ?? 0) > 0 && (
          <Badge variant="medium">{batch.duplicatesFound} dupes</Badge>
        )}
        <button
          onClick={() => {
            if (confirm(`Remove batch "${batch.fileName}" and its ${batch.recordCount} records?`)) {
              onRemove(batch.id)
              toast.info(`Removed ${batch.fileName}`)
            }
          }}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
