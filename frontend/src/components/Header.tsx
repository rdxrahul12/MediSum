import { useState, useEffect } from "react";
import { Activity } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "Tech", href: "#tech" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Team", href: "#team" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-lg border-b"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <a href="#" className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          MediSum AI
        </a>
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="https://github.com/rdxrahul12/MediSum"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
