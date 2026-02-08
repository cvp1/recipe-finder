import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import RecipePage from "./pages/RecipePage";
import SavedRecipesPage from "./pages/SavedRecipesPage";
import SuggestionsPage from "./pages/SuggestionsPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/suggestions" element={<SuggestionsPage />} />
          <Route path="/saved" element={<SavedRecipesPage />} />
        </Routes>
      </main>
    </div>
  );
}
