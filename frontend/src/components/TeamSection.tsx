import { useScrollReveal } from "@/hooks/useScrollReveal";

const team = [
  {
    name: "Rahul Dewasi",
    github: "rdxrahul12",
    image: "/team/Rahul Dewasi.jpeg"
  },
  {
    name: "Ankit Saini",
    github: "AnkitS24",
    image: "/team/Ankit Saini.jpeg"
  },
  {
    name: "Tushar Verma",
    github: "Tusharvermaaa",
    image: "/team/Tushar Verma.jpeg"
  },
  {
    name: "Himanshu Maurya",
    github: "himanshumaurya2329",
    image: "/team/Himanshu.jpg"
  },
];

export default function TeamSection() {
  const ref = useScrollReveal();
  return (
    <section id="team" className="py-24 px-4 bg-secondary/30">
      <div ref={ref} className="reveal container mx-auto max-w-4xl text-center">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
          The Team
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-foreground mb-12">
          Meet the Minds Behind MediSum
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {team.map((t) => (
            <a
              key={t.name}
              href={t.github ? `https://github.com/${t.github}` : "#team"}
              target={t.github ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-4 transition-transform hover:-translate-y-2"
            >
              <div className="relative overflow-hidden w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-secondary border border-border group-hover:border-primary/50 transition-all shadow-sm group-hover:shadow-md">
                {t.image ? (
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground bg-accent/20">
                    {t.name[0]}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  @{t.github}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
