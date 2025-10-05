import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

const experiences = [
  {
    role: "Full-Stack Developer",
    company: "Sopris Apps",
    location: "Remote",
    period: "February 2025 - Present",
    description: "Designed and developed an advanced AI-driven client-agent communication platform with multi-agent architecture. Implemented RAG workflows using vector databases for context-aware responses powered by OpenAI GPT and Google Gemini. Built voice AI agent with TTS/STT pipelines.",
    tags: ["TypeScript", "React", "Supabase", "PostgreSQL", "OpenAI", "RAG", "Multi-Agent Systems", "Voice AI"],
  },
  {
    role: "Founder",
    company: "ER Consulting LLC",
    location: "Remote",
    period: "November 2024 - Present",
    description: "Delivered AI, automation, and product development consulting for clients worldwide. Built end-to-end pipelines for document parsing, knowledge base creation, chatbot training, and AI-driven workflow automation. Registered LLC in Delaware, operating internationally.",
    tags: ["AI Solutions", "Automation", "Consulting", "Product Development", "API Integration"],
  },
  {
    role: "Founder",
    company: "LifeMirror",
    location: "Remote",
    period: "November 2024 - Present",
    description: "Created concept and prototype for an AI-powered life playback tool combining passive tracking, emotional reflection, and memory recall. Implemented AI-driven algorithms for memory reconstruction, sentiment analysis, and pattern recognition.",
    tags: ["AI", "Sentiment Analysis", "Python", "Machine Learning", "Product Design"],
  },
  {
    role: "Founder",
    company: "AuraPulse",
    location: "Remote",
    period: "November 2024 - Present",
    description: "Built an energy and wellness app leveraging iOS/Android native capabilities. Implemented secure Supabase authentication with universal deep linking. Configured custom DNS, iOS Universal Links, and Android App Links for native email verification.",
    tags: ["React Native", "Supabase", "iOS", "Android", "Deep Linking", "Authentication"],
  },
  {
    role: "Founder",
    company: "Sip AI",
    location: "Remote",
    period: "November 2024 - Present",
    description: "Built a PWA-first daily drink companion app integrating AI-driven personalization. Designed modular, scalable architecture for cross-platform compatibility. Implemented AI algorithms for adaptive habit tracking and personalized recommendations.",
    tags: ["PWA", "AI", "React", "Personalization", "UX/UI"],
  },
  {
    role: "Social Support Specialist",
    company: "Cognizant",
    location: "Remote",
    period: "November 2022 - October 2024",
    description: "Delivered technical support to Waze customers through social media channels. Responded to tickets in adherence to SLA and quality requirements. Performed customer sentiment analysis and moderated flagged posts and comments.",
    tags: ["Customer Service", "Social Media", "Sentiment Analysis", "Quality Assurance"],
  },
];

const Experience = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Career Journey
          </h2>
          <p className="text-lg text-muted-foreground">
            Building innovative solutions across diverse environments
          </p>
        </div>

        <div className="space-y-6">
          {experiences.map((exp, index) => (
            <Card
              key={index}
              className="group p-6 bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] animate-fade-in relative overflow-hidden"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
                      {exp.role}
                    </h3>
                    <p className="text-lg text-primary font-medium">{exp.company}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{exp.period}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{exp.location}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-4">
                  {exp.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {exp.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;