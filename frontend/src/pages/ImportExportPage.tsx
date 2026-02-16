import { ArrowLeftRight } from "lucide-react";
import ImportExportBar from "../components/ImportExportBar";

export default function ImportExportPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <ArrowLeftRight className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold text-gray-900">Import & Export</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Import recipes from Paprika, URLs, or text files. Export your collection in Paprika or Markdown format.
      </p>
      <ImportExportBar />
    </div>
  );
}
