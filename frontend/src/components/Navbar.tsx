import { ChefHat, BookOpen, Lightbulb, Bookmark } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Find Recipes", icon: ChefHat },
  { to: "/suggestions", label: "Daily Picks", icon: Lightbulb },
  { to: "/saved", label: "Saved", icon: Bookmark },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
          <BookOpen className="h-6 w-6" />
          Recipe Finder
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === to
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
