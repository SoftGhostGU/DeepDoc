"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Document } from "@/types";

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;
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
    return "不支持的文件类型，支持格式：PDF、MD、TXT";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `文件过大（${formatFileSize(file.size)}），最大支持 ${formatFileSize(
      MAX_FILE_SIZE_BYTES,
    )}`;
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
      return "将文件拖到此处，或从电脑中选择";
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
    <Card className="border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <CardHeader className={compact ? "pb-3" : ""}>
        <h2 className="text-base font-semibold text-[var(--foreground)]">上传文档</h2>
        {!compact && (
          <CardDescription>
            支持 PDF、Markdown 和文本文件，最大 {formatFileSize(MAX_FILE_SIZE_BYTES)}
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
          className={`w-full rounded-lg border border-dashed px-4 py-6 text-left transition-[border-color,background-color,box-shadow] duration-200 ${
            isDragging
              ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_12px_28px_rgba(79,70,229,0.18)]"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] p-2 text-[var(--accent-hover)]">
              <Upload className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">拖拽文件到此处</p>
              <p className="text-xs text-[var(--foreground-dim)]">{helperText}</p>
            </div>
          </div>
        </button>

        {progress > 0 && isUploading && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-[var(--surface-hover)]">
              <div
                className="animate-shimmer h-2 rounded-full bg-[linear-gradient(90deg,rgba(99,102,241,0.35),rgba(129,140,248,0.9),rgba(79,70,229,0.35))] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-[var(--foreground-dim)]">上传中... {progress}%</p>
          </div>
        )}

        {error && <p className="text-xs text-[#fca5a5]">{error}</p>}

        <Button onClick={upload} disabled={!selectedFile || isUploading} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              上传文件
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
