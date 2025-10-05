import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

const experiences = [
  {
    role: "Senior Full-Stack Developer",
    company: "Tech Innovations Inc.",
    location: "Remote",
    period: "2022 - Present",
    description: "Leading development of AI-powered web applications with focus on scalability and performance. Architected microservices infrastructure serving 100K+ users.",
    tags: ["React", "Node.js", "AI/ML", "AWS"],
  },
  {
    role: "Full-Stack Developer",
    company: "Digital Solutions Corp",
    location: "San Francisco, CA",
    period: "2020 - 2022",
    description: "Built and maintained enterprise-level applications. Implemented CI/CD pipelines and improved deployment efficiency by 60%.",
    tags: ["TypeScript", "PostgreSQL", "Docker", "Kubernetes"],
  },
  {
    role: "Frontend Developer",
    company: "Startup Ventures",
    location: "New York, NY",
    period: "2018 - 2020",
    description: "Developed responsive web applications with modern frameworks. Collaborated with designers to create pixel-perfect interfaces.",
    tags: ["React", "Tailwind CSS", "Figma", "REST APIs"],
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