import { Loader2 } from "lucide-react";

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      <p className="mt-3 font-sans text-sm text-stone-400">{message}</p>
    </div>
  );
}
