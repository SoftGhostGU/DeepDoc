"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Document } from "@/types";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".txt"];

type UploadResponse = {
  document: Document;
};

interface DocumentUploadProps {
  compact?: boolean;
  onUploaded?: (document: Document) => void;
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Unsupported file type. Supported types: PDF, MD, TXT.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Max size is ${formatFileSize(
      MAX_FILE_SIZE_BYTES,
    )}.`;
  }

  return null;
}

export function DocumentUpload({ compact = false, onUploaded }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const helperText = useMemo(() => {
    if (!selectedFile) {
      return "Drop a file here, or browse from your computer.";
    }

    return `${selectedFile.name} (${formatFileSize(selectedFile.size)})`;
  }, [selectedFile]);

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const onFilePicked = (file: File | null) => {
    if (!file) {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const upload = async () => {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("file", selectedFile);

      const response = await new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const nextProgress = Math.round((event.loaded / event.total) * 100);
            setProgress(nextProgress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText) as UploadResponse);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed due to a network error"));

        xhr.open("POST", "/api/upload");
        xhr.send(payload);
      });

      onUploaded?.(response.document);
      setSelectedFile(null);
      setProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : ""}>
        <CardTitle className="text-base">Upload document</CardTitle>
        {!compact && (
          <CardDescription>
            Supports PDF, Markdown, and text files up to {formatFileSize(MAX_FILE_SIZE_BYTES)}.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(event) => {
            onFilePicked(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={openFileDialog}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            onFilePicked(event.dataTransfer.files?.[0] ?? null);
          }}
          className={`w-full rounded-lg border border-dashed px-4 py-6 text-left transition ${
            isDragging
              ? "border-slate-900 bg-slate-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-slate-100 p-2 text-slate-700">
              <Upload className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Drag and drop a file</p>
              <p className="text-xs text-slate-500">{helperText}</p>
            </div>
          </div>
        </button>

        {progress > 0 && isUploading && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">Uploading... {progress}%</p>
          </div>
        )}

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <Button onClick={upload} disabled={!selectedFile || isUploading} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Upload file
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
