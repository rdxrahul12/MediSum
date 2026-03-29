import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const stackItems = [
  { name: "Python", cat: "Backend" },
  { name: "Flask", cat: "Backend" },
  { name: "LangChain", cat: "AI" },
  { name: "Ollama", cat: "AI" },
  { name: "Qwen2.5-3B", cat: "AI" },
  { name: "ChromaDB", cat: "AI" },
  { name: "React", cat: "Frontend" },
  { name: "Vite", cat: "Frontend" },
  { name: "Tailwind CSS", cat: "Frontend" },
  { name: "TypeScript", cat: "Frontend" },
];

export default function TechStack() {
  const ref = useScrollReveal();
  return (
    <section id="tech" className="py-24 px-4 bg-secondary/30">
      <div ref={ref} className="reveal container mx-auto max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary text-center mb-2">
          Technology
        </h2>
        <p className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
          Built with modern tools
        </p>

        <Tabs defaultValue="stack" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stack">Stack</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="stack" className="mt-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {stackItems.map((s) => (
                <Badge key={s.name} variant="outline" className="text-sm py-1.5 px-4">
                  {s.name}
                  <span className="ml-2 text-xs text-muted-foreground">{s.cat}</span>
                </Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="architecture" className="mt-6">
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                <strong className="text-foreground">1. Document Ingestion:</strong> PDFs are parsed
                via PyPDF2; raw text is accepted directly. Content is split into semantic chunks.
              </p>
              <p>
                <strong className="text-foreground">2. Embedding & Retrieval:</strong> Chunks are
                embedded and stored in ChromaDB. On query, relevant chunks are retrieved using
                similarity search (RAG pattern).
              </p>
              <p>
                <strong className="text-foreground">3. LLM Generation:</strong> Retrieved context is
                passed to Qwen2.5-3B via Ollama. The model generates structured markdown with NER
                entities, urgency levels, and clinical timelines.
              </p>
              <p>
                <strong className="text-foreground">4. Streaming Response:</strong> Output is
                streamed in real-time to the React frontend with terminal log visibility.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                <strong className="text-foreground">Zero Cloud Dependency.</strong> The entire
                pipeline — model, embeddings, vector store — runs on your local machine.
              </p>
              <p>
                <strong className="text-foreground">No API Keys Required.</strong> Ollama serves the
                model locally. No OpenAI, no third-party services.
              </p>
              <p>
                <strong className="text-foreground">No Login or Accounts.</strong> Open the app and
                use it. No telemetry, no tracking, no data collection.
              </p>
              <p>
                <strong className="text-foreground">HIPAA-Friendly by Design.</strong> Patient data
                never leaves the host environment. Ideal for clinical and research settings.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
