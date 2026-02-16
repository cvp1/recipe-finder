import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Library, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backfillImages, createTab, deleteTab, getAllRecipes, getTabs, saveRecipe, unsaveRecipe, updateTab } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";

export default function AllRecipesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [menuTabId, setMenuTabId] = useState<number | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: tabs } = useQuery({
    queryKey: ["tabs"],
    queryFn: getTabs,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["allRecipes", page, activeSearch, source, activeTabId],
    queryFn: () => getAllRecipes(page, 20, activeSearch, source, activeTabId),
  });

  const save = useMutation({
    mutationFn: (id: string) => saveRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allRecipes"] }),
  });

  const unsave = useMutation({
    mutationFn: (id: string) => unsaveRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allRecipes"] }),
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createTab(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      setNewTabName("");
      setShowCreateInput(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTab(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      if (activeTabId === deletedId) setActiveTabId(undefined);
      setMenuTabId(null);
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateTab(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      setRenamingTabId(null);
    },
  });

  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const backfillMut = useMutation({
    mutationFn: backfillImages,
    onSuccess: (result) => {
      if (result.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ["allRecipes"] });
        setBackfillMsg(`Found images for ${result.updated} of ${result.total} recipes`);
      } else {
        const detail = result.errors?.[0] ?? "";
        setBackfillMsg(
          result.total === 0
            ? "All recipes already have images"
            : !result.pexels_key_set
              ? "PEXELS_API_KEY is not set on the server"
              : `Failed (${result.total} recipes): ${detail}`
        );
      }
      setTimeout(() => setBackfillMsg(null), 8000);
    },
  });

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuTabId(null);
      }
    }
    if (menuTabId !== null) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuTabId]);

  // Focus create input
  useEffect(() => {
    if (showCreateInput) createInputRef.current?.focus();
  }, [showCreateInput]);

  // Focus rename input
  useEffect(() => {
    if (renamingTabId !== null) renameInputRef.current?.focus();
  }, [renamingTabId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newTabName.trim()) createMut.mutate(newTabName.trim());
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (renamingTabId !== null && renameValue.trim()) {
      renameMut.mutate({ id: renamingTabId, name: renameValue.trim() });
    }
  }

  function startRename(tabId: number, currentName: string) {
    setMenuTabId(null);
    setRenameValue(currentName);
    setRenamingTabId(tabId);
  }

  const recipes = data?.recipes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.per_page ?? 20));
  const activeTabName = activeTabId ? tabs?.find((t) => t.id === activeTabId)?.name : undefined;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTabName ?? "All Recipes"}
          </h1>
          <p className="mt-1 text-gray-500">
            {total} recipe{total !== 1 ? "s" : ""}{activeTabName ? ` in ${activeTabName}` : " in library"}
          </p>
        </div>
        <button
          onClick={() => backfillMut.mutate()}
          disabled={backfillMut.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          title="Find images for recipes that don't have one"
        >
          <ImagePlus className="h-4 w-4" />
          {backfillMut.isPending ? "Searching..." : "Find Images"}
        </button>
      </div>
      {backfillMsg && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {backfillMsg}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        <button
          onClick={() => { setActiveTabId(undefined); setPage(1); }}
          className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTabId === undefined
              ? "border-b-2 border-amber-500 text-amber-900"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          All
        </button>

        {tabs?.map((tab) => (
          <div key={tab.id} className="relative flex shrink-0 items-center">
            {renamingTabId === tab.id ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 px-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-24 rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                  onKeyDown={(e) => { if (e.key === "Escape") setRenamingTabId(null); }}
                />
                <button type="submit" className="rounded p-0.5 text-green-600 hover:bg-green-50">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setRenamingTabId(null)} className="rounded p-0.5 text-stone-400 hover:bg-stone-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => { setActiveTabId(tab.id); setPage(1); }}
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTabId === tab.id
                      ? "border-b-2 border-amber-500 text-amber-900"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {tab.name}
                  <span className="ml-1.5 text-xs text-stone-400">{tab.recipe_count}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuTabId(menuTabId === tab.id ? null : tab.id); }}
                  className="rounded p-0.5 text-stone-300 hover:text-stone-500"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Dropdown menu */}
            {menuTabId === tab.id && (
              <div
                ref={menuRef}
                className="absolute left-0 top-full z-10 mt-1 w-32 rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
              >
                <button
                  onClick={() => startRename(tab.id, tab.name)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
                <button
                  onClick={() => deleteMut.mutate(tab.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Create tab */}
        {showCreateInput ? (
          <form onSubmit={handleCreateSubmit} className="flex shrink-0 items-center gap-1 px-1">
            <input
              ref={createInputRef}
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="Tab name..."
              className="w-28 rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              onKeyDown={(e) => { if (e.key === "Escape") { setShowCreateInput(false); setNewTabName(""); } }}
            />
            <button type="submit" disabled={!newTabName.trim()} className="rounded p-0.5 text-green-600 hover:bg-green-50 disabled:opacity-50">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setShowCreateInput(false); setNewTabName(""); }} className="rounded p-0.5 text-stone-400 hover:bg-stone-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateInput(true)}
            className="shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
            title="Create collection"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search and filter */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes by name..."
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            Search
          </button>
        </form>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">All sources</option>
          <option value="ai">AI Generated</option>
          <option value="imported">Imported</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading recipes..." />
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Library className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">
            {activeSearch || source || activeTabId ? "No recipes match your filters." : "No recipes yet."}
          </p>
          <p className="text-sm text-gray-400">
            Generate recipes on the home page or import from Paprika.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSave={(id) => save.mutate(id)}
                onUnsave={(id) => unsave.mutate(id)}
                showTabAction
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
