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
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-glow-cyan hover:shadow-glow-pink transition-all duration-300 animate-glow-pulse"
          size="icon"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}

      {/* Main Content */}
      <Hero onOpenChat={() => setIsChatOpen(true)} />
      <Skills />
      <Experience />

      {/* AI Chat Modal */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
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