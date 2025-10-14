import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, User, Loader2, Calendar, MessageSquare, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ContactForm, { LeadData } from "./ContactForm";
import SimpleContactForm, { SimpleContactData } from "./SimpleContactForm";
import HRTargeting from "./HRTargeting";
import profilePic from "@/assets/profile-picture-edited.jpg";

interface Message {
  role: "user" | "assistant";
  content: string;
  showContactPrompt?: boolean;
  isLeadGeneration?: boolean;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat = ({ isOpen, onClose }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm Ernst AI, your AI-powered digital avatar. I'm here to help you learn about my skills, experience, and how I can assist with your projects. Whether you're in HR looking to learn more about my background, or a potential client interested in my services, feel free to ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [conversationSummary, setConversationSummary] = useState("");
  const [interestArea, setInterestArea] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [showEndConversationPrompt, setShowEndConversationPrompt] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [showSimpleContactForm, setShowSimpleContactForm] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log("showSimpleContactForm state changed:", showSimpleContactForm);
  }, [showSimpleContactForm]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLeadCaptured = (leadData: LeadData) => {
    setShowContactForm(false);
    setConversationSummary("");
    setInterestArea("");
    
    // Add a thank you message
    const thankYouMessage: Message = {
      role: "assistant",
      content: `Thank you ${leadData.name}! I've received your information and I'm excited about the possibility of working together on ${leadData.interestArea}. I'll review your details and get back to you within 24 hours. In the meantime, feel free to ask me any other questions about my experience or projects!`,
    };
    
    setMessages(prev => [...prev, thankYouMessage]);
    
    toast({
      title: "Lead Captured!",
      description: "Thank you for your interest. I'll be in touch soon!",
    });
  };

  const shouldShowContactPrompt = (message: string): boolean => {
    const contactKeywords = [
      'hire', 'hiring', 'job', 'position', 'role', 'work with', 'collaborate',
      'project', 'consulting', 'services', 'help', 'assist', 'build',
      'develop', 'create', 'interested', 'contact', 'reach out', 'meeting',
      'discuss', 'opportunity', 'partnership', 'team', 'company'
    ];
    
    const lowerMessage = message.toLowerCase();
    return contactKeywords.some(keyword => lowerMessage.includes(keyword)) && 
           messages.length >= 3; // Only after a few exchanges
  };

  const shouldShowEndConversationPrompt = (): boolean => {
    // Show after 5+ exchanges and no contact form shown yet
    return conversationCount >= 5 && !showContactForm && !showEndConversationPrompt;
  };

  const handleEndConversation = () => {
    setShowEndConversationPrompt(true);
    setShowContactForm(true);
  };

  const handleSimpleContactSaved = (contactData: SimpleContactData) => {
    setShowSimpleContactForm(false);
    setConversationSummary("");
    
    // Add a thank you message
    const thankYouMessage: Message = {
      role: "assistant",
      content: `Thank you ${contactData.name}! I've received your contact information and I'll be in touch soon. Feel free to ask me any other questions!`,
    };
    
    setMessages(prev => [...prev, thankYouMessage]);
    
    toast({
      title: "Contact Saved!",
      description: "Thank you for sharing your information. I'll be in touch soon!",
    });
  };

  const handleScheduleMeeting = () => {
    // Open Calendly with the booking widget
    window.open("https://calendly.com/ernstai/45min", "_blank", "noopener,noreferrer");
  };

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setLastUserMessage(userMessage);
    setConversationCount(prev => prev + 1);
    setIsLoading(true);

    // Update conversation summary for lead generation
    const currentSummary = conversationSummary + `\nUser: ${userMessage}`;
    setConversationSummary(currentSummary);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: newMessages,
            conversationSummary: currentSummary,
            showLeadGeneration: true
          }),
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

      // After the AI response is complete, check if we should show contact prompt
      if (shouldShowContactPrompt(userMessage)) {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].showContactPrompt = true;
          return newMessages;
        });
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
    <>
      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactForm
          onClose={() => setShowContactForm(false)}
          onLeadCaptured={handleLeadCaptured}
          conversationSummary={conversationSummary}
          interestArea={interestArea}
        />
      )}

      {/* Simple Contact Form Modal */}
      {showSimpleContactForm && (
        <SimpleContactForm
          onClose={() => {
            console.log("Closing simple contact form");
            setShowSimpleContactForm(false);
          }}
          onContactSaved={handleSimpleContactSaved}
          conversationSummary={conversationSummary}
        />
      )}

      {/* Debug indicator */}
      {showSimpleContactForm && (
        <div className="fixed top-4 right-4 z-[70] bg-red-500 text-white p-2 rounded">
          SimpleContactForm should be visible
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl h-[95vh] max-h-[800px] flex flex-col bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary/30 animate-glow-pulse">
              <img src={profilePic} alt="Ernst AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Ernst AI</h3>
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
        <ScrollArea className="flex-1 p-3 sm:p-4">
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
                  className={`max-w-[90%] sm:max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/50"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  
                  {/* HR Targeting for Assistant Messages */}
                  {message.role === "assistant" && lastUserMessage && (
                    <HRTargeting
                      userMessage={lastUserMessage}
                      onContactRequest={() => setShowSimpleContactForm(true)}
                      onMeetingRequest={handleScheduleMeeting}
                    />
                  )}

                  {/* End Conversation Prompt */}
                  {message.role === "assistant" && shouldShowEndConversationPrompt() && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                            Let's Connect!
                          </h4>
                          <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                            I'd love to continue this conversation and explore how we can work together. 
                            Would you like to schedule a meeting to discuss your project or opportunities?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={handleEndConversation}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Yes, Let's Meet!
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowEndConversationPrompt(false)}
                              className="text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/20"
                            >
                              Maybe Later
                            </Button>
                          </div>
                          <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                            Or book directly: <a href="https://calendly.com/ernstai/45min" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">https://calendly.com/ernstai/45min</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Prompt for Assistant Messages */}
                  {message.role === "assistant" && message.showContactPrompt && (
                    <div className="mt-3 p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-foreground mb-3">
                        Interested in working together?
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Share Contact Info button clicked");
                            setShowSimpleContactForm(true);
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Share Contact Info
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleScheduleMeeting}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Meeting
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Or book directly: <a href="https://calendly.com/ernstai/45min" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://calendly.com/ernstai/45min</a>
                      </div>
                    </div>
                  )}
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
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-border/50 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 bg-input border-border/50 focus:border-primary text-sm sm:text-base"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-cyan px-3 sm:px-4"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </form>
      </Card>
      </div>
    </>
  );
};

export default AIChat;