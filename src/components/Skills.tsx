import { Code2, Database, Sparkles, Zap, Globe, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";

const skills = [
  {
    icon: Code2,
    title: "Languages & Frameworks",
    description: "TypeScript, JavaScript (React, Node.js, React Native), Python (FastAPI, Flask, Django), HTML5, CSS3",
    color: "text-primary",
    glow: "shadow-glow-cyan",
  },
  {
    icon: Database,
    title: "Databases & Cloud",
    description: "Supabase, PostgreSQL, Firebase, MongoDB, AWS, Vercel",
    color: "text-accent",
    glow: "shadow-glow-pink",
  },
  {
    icon: Brain,
    title: "AI & Machine Learning",
    description: "OpenAI GPT, Google Gemini, DeepSeek, LangChain, NLP, embeddings, RAG, model deployment",
    color: "text-secondary",
    glow: "shadow-glow-purple",
  },
  {
    icon: Zap,
    title: "Tools & DevOps",
    description: "Git, Docker, CI/CD, RapidAPI, ExtractorAPI, REST/GraphQL APIs, Apify API",
    color: "text-primary",
    glow: "shadow-glow-cyan",
  },
  {
    icon: Globe,
    title: "Full-Stack Development",
    description: "End-to-end application development across web, mobile, and cloud environments",
    color: "text-accent",
    glow: "shadow-glow-pink",
  },
  {
    icon: Sparkles,
    title: "AI Specialties",
    description: "AI chatbot development, real-time analytics, SaaS architecture, multi-agent systems, document processing, web scraping",
    color: "text-secondary",
    glow: "shadow-glow-purple",
  },
];

const Skills = () => {
  return (
    <section id="skills" className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Technical Arsenal
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive toolkit for building next-generation applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill, index) => {
            const Icon = skill.icon;
            return (
              <Card
                key={skill.title}
                className="group relative p-6 bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${skill.glow}`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${skill.color} to-transparent mb-4 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${skill.color}`} />
                  </div>
                  
                  <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                    {skill.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm">
                    {skill.description}
                  </p>
                </div>

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-${skill.color}/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Skills;