import { useState, useRef } from "react";
import { ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";

interface Props {
  onSuccess: (count: number) => void;
}

export default function PdfUpload({ onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ imported: number }>("/transactions/pdf-import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess(data.imported);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "PDF import failed. Ensure it is a text-based bank statement.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-primary-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm">Parsing your statement…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium">Drop your bank statement PDF here</p>
            <p className="text-xs text-gray-400">or click to browse — text-based PDFs only</p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <DocumentTextIcon className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}
