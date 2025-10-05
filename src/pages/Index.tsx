import { useState } from "react";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Fixed Chat Button */}
      {!isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary/90 shadow-glow-cyan hover:shadow-glow-pink transition-all duration-300 animate-glow-pulse"
          size="icon"
        >
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      )}

      {/* Main Content */}
      <Hero onOpenChat={() => setIsChatOpen(true)} />
      <Skills />
      <Experience />

      {/* AI Chat Modal */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2025 AI Portfolio. Built with{" "}
            <span className="text-primary">Lovable</span> & powered by{" "}
            <span className="text-accent">AI</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;