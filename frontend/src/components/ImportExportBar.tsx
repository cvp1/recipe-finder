import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Globe, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { exportAllPaprika, exportSavedPaprika, importFromFiles, importFromUrl, importPaprika } from "../api/client";

export default function ImportExportBar() {
  const paprikaInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");
  const queryClient = useQueryClient();

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  const paprikaMutation = useMutation({
    mutationFn: importPaprika,
    onSuccess: (result) => {
      showMessage(result.message, "success");
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
    },
    onError: () => showMessage("Failed to import recipes. Check the file format.", "error"),
  });

  const urlMutation = useMutation({
    mutationFn: importFromUrl,
    onSuccess: (result) => {
      showMessage(result.message, result.imported > 0 ? "success" : "error");
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
      setShowUrlInput(false);
      setUrl("");
    },
    onError: () => showMessage("Failed to import from URL.", "error"),
  });

  const fileMutation = useMutation({
    mutationFn: importFromFiles,
    onSuccess: (result) => {
      showMessage(result.message, result.imported > 0 ? "success" : "error");
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
    },
    onError: () => showMessage("Failed to import files.", "error"),
  });

  const isLoading = paprikaMutation.isPending || urlMutation.isPending || fileMutation.isPending;

  function handlePaprikaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      paprikaMutation.mutate(file);
      e.target.value = "";
    }
  }

  function handleTextFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      fileMutation.mutate(Array.from(files));
      e.target.value = "";
    }
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) {
      urlMutation.mutate(url.trim());
    }
  }

  const btnClass =
    "flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50";

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Paprika import */}
        <input
          ref={paprikaInputRef}
          type="file"
          accept=".paprikarecipes"
          onChange={handlePaprikaSelect}
          className="hidden"
        />
        <button onClick={() => paprikaInputRef.current?.click()} disabled={isLoading} className={btnClass}>
          <Upload className="h-4 w-4" />
          {paprikaMutation.isPending ? "Importing..." : "Import Paprika"}
        </button>

        {/* URL import */}
        <button onClick={() => setShowUrlInput(!showUrlInput)} disabled={isLoading} className={btnClass}>
          <Globe className="h-4 w-4" />
          Import from URL
        </button>

        {/* Text/Markdown file import */}
        <input
          ref={textFileInputRef}
          type="file"
          accept=".txt,.md"
          multiple
          onChange={handleTextFileSelect}
          className="hidden"
        />
        <button onClick={() => textFileInputRef.current?.click()} disabled={isLoading} className={btnClass}>
          <FileText className="h-4 w-4" />
          {fileMutation.isPending ? "Importing..." : "Import Files"}
        </button>

        {/* Export */}
        <button onClick={exportSavedPaprika} className={btnClass}>
          <Download className="h-4 w-4" />
          Export Saved
        </button>
        <button onClick={exportAllPaprika} className={btnClass}>
          <Download className="h-4 w-4" />
          Export All
        </button>
      </div>

      {/* URL input form */}
      {showUrlInput && (
        <form onSubmit={handleUrlSubmit} className="mt-3 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/recipe..."
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <button
            type="submit"
            disabled={urlMutation.isPending || !url.trim()}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {urlMutation.isPending ? "Importing..." : "Import"}
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlInput(false); setUrl(""); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      )}

      {message && (
        <div
          className={`mt-3 rounded-lg px-4 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
