import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Footer() {
  return (
    <footer className="border-t py-10 px-4">
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">MediSum AI</span>
          <Badge variant="outline" className="text-xs">MIT License</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Built with privacy in mind. Your data never leaves your machine.</p>
        <a
          href="https://github.com/rdxrahul12/MediSum"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub →
        </a>
      </div>
    </footer>
  );
}
