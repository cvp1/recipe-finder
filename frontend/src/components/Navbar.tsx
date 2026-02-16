import { BookOpen, Bookmark, ChefHat, Library, Lightbulb } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Find", icon: ChefHat },
  { to: "/recipes", label: "Library", icon: Library },
  { to: "/suggestions", label: "Daily", icon: Lightbulb },
  { to: "/saved", label: "Saved", icon: Bookmark },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="border-b border-amber-200/60 bg-amber-50/70 backdrop-blur-sm print-hide">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-sans text-lg font-bold text-amber-900">
          <BookOpen className="h-5 w-5 text-amber-600" />
          <span className="hidden sm:inline">Recipe Finder</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-sm font-medium transition-colors ${
                location.pathname === to
                  ? "bg-amber-100 text-amber-900"
                  : "text-amber-700/70 hover:bg-amber-100/50 hover:text-amber-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
