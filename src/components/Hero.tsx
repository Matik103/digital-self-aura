import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroProps {
  onOpenChat: () => void;
}

const Hero = ({ onOpenChat }: HeroProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-4 sm:px-6">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 sm:left-20 w-48 h-48 sm:w-72 sm:h-72 bg-primary/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-20 right-10 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 bg-accent/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className={`relative z-10 max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/30 mb-6 sm:mb-8 animate-glow-pulse">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            AI-Powered Digital Avatar
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
          Ernst Romain
        </h1>
        
        <div className="relative mb-3 sm:mb-4">
          <h2 className="font-display text-lg sm:text-2xl md:text-3xl lg:text-4xl font-medium text-foreground/90 animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            Full-Stack Developer & AI Engineer
          </h2>
          <div className="absolute -inset-2 bg-primary/5 blur-xl rounded-full" />
        </div>

        <p className="text-xs sm:text-sm md:text-md text-muted-foreground/80 mb-6 sm:mb-8 animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
          Remote (Available Globally)
        </p>

        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 px-4 leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
          An enthusiastic full-stack developer and AI engineer building scalable applications, conversational AI systems, and mobile-first platforms. Ask my AI avatar anything about my skills, experience, and projects.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Button 
            size="lg"
            onClick={onOpenChat}
            className="w-full sm:w-auto relative group overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-display shadow-glow-cyan hover:shadow-glow-pink transition-all duration-300"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Chat with My AI Avatar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>
          
          <Button 
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-primary/50 text-foreground hover:bg-primary/10 hover:border-primary font-display backdrop-blur-sm"
            onClick={() => {
              document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="text-sm sm:text-base">Explore Skills</span>
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="hidden sm:block absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-primary rounded-full animate-scan" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;