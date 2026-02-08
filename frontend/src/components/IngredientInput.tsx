import { Plus, X } from "lucide-react";
import { useState } from "react";

interface Props {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  disabled?: boolean;
}

export default function IngredientInput({ ingredients, onChange, disabled }: Props) {
  const [input, setInput] = useState("");

  function addIngredient() {
    const trimmed = input.trim();
    if (trimmed && !ingredients.includes(trimmed.toLowerCase())) {
      onChange([...ingredients, trimmed.toLowerCase()]);
      setInput("");
    }
  }

  function removeIngredient(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an ingredient and press Enter..."
          disabled={disabled}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50"
        />
        <button
          onClick={addIngredient}
          disabled={disabled || !input.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          Add
        </button>
      </div>

      {ingredients.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ingredients.map((ingredient, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-800"
            >
              {ingredient}
              <button
                onClick={() => removeIngredient(index)}
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-primary-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
