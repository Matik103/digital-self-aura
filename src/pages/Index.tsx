import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import AIChat from "@/components/AIChat";
import PopulateRAG from "@/components/PopulateRAG";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hand, X } from "lucide-react";
import profilePic from "@/assets/profile-picture-edited.jpg";

const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  // Hide greeting after 8 seconds or when chat opens
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleChatOpen = () => {
    setIsChatOpen(true);
    setShowGreeting(false);
  };

  return (
    <div className="relative min-h-screen">
      {/* Greeting Popup */}
      {!isChatOpen && showGreeting && (
        <Card className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-50 p-4 max-w-xs bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-[wave_1s_ease-in-out_3]">
              <Hand className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium mb-1">
                Hey there! 👋
              </p>
              <p className="text-xs text-muted-foreground">
                Got questions about my skills, experience, or projects? Ask away!
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGreeting(false)}
              className="flex-shrink-0 h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Fixed Chat Button with Profile Picture */}
      {!isChatOpen && (
        <Button
          onClick={handleChatOpen}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0 overflow-hidden bg-primary hover:bg-primary/90 shadow-glow-cyan hover:shadow-glow-pink transition-all duration-300 animate-glow-pulse border-2 border-primary/30"
          size="icon"
        >
          <img 
            src={profilePic} 
            alt="Ernst Romain - Chat with AI Avatar" 
            className="w-full h-full object-cover"
          />
        </Button>
      )}

      {/* Main Content */}
      <Hero onOpenChat={handleChatOpen} />
      <Skills />
      <Experience />
      
      {/* RAG Population Tool - Hidden but kept for future use */}
      {/* <section className="py-12 px-4 sm:px-6 bg-background/50">
        <PopulateRAG />
      </section> */}

      {/* AI Chat Modal */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2025 Ernst Romain. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            <Link to="/policy" className="text-primary hover:underline">
              Security & Data Protection Policy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;