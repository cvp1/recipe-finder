import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { exportAllPaprika, importPaprika } from "../api/client";

export default function ImportExportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: importPaprika,
    onSuccess: (result) => {
      setMessage({ text: result.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
      setTimeout(() => setMessage(null), 5000);
    },
    onError: () => {
      setMessage({ text: "Failed to import recipes. Check the file format.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = "";
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".paprikarecipes"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importMutation.isPending ? "Importing..." : "Import from Paprika"}
        </button>
        <button
          onClick={exportAllPaprika}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export to Paprika
        </button>
      </div>

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
