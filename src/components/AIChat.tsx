import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import profilePic from "@/assets/profile-picture-edited.jpg";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat = ({ isOpen, onClose }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm Ernst AI. Ask me anything about skills, experience, or projects!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let textBuffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMessage;
                return newMessages;
              });
            }
          } catch (e) {
            console.error("Error parsing SSE:", e);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    streamChat(userMessage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl h-[90vh] sm:h-[600px] flex flex-col bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary/30 animate-glow-pulse">
              <img src={profilePic} alt="Ernst AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Ernst AI</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Powered by Lovable AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 animate-fade-in ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
                    <img src={profilePic} alt="Ernst AI" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/50"
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30">
                  <img src={profilePic} alt="Ernst AI" className="w-full h-full object-cover" />
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-2 sm:p-4 border-t border-border/50 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 bg-input border-border/50 focus:border-primary"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-cyan"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AIChat;