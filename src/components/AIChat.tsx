import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, User, Loader2, Calendar, MessageSquare, Mail, Volume2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ContactForm, { LeadData } from "./ContactForm";
import SimpleContactForm, { SimpleContactData } from "./SimpleContactForm";
import HRTargeting from "./HRTargeting";
import profilePic from "@/assets/profile-picture-edited.jpg";
import { callFunction } from "@/lib/functions";
import {
  extractEmail,
  hasStrongContactIntent,
  hasStrongHrIntent,
} from "@/lib/chatIntent";

interface Message {
  role: "user" | "assistant";
  content: string;
  showSoftOffer?: boolean;
  showHrCard?: boolean;
  showEmailAsk?: boolean;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME =
  "Hi — I am Ernst's AI avatar (not live Ernst). Ask me about my skills, projects, or how I work. We can keep chatting as long as you like; only share contact details if you want a follow-up.";

const AIChat = ({ isOpen, onClose }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [conversationSummary, setConversationSummary] = useState("");
  const [interestArea, setInterestArea] = useState("");
  const [conversationCount, setConversationCount] = useState(0);
  const [showSimpleContactForm, setShowSimpleContactForm] = useState(false);
  const [softOfferShown, setSoftOfferShown] = useState(false);
  const [hrCardShown, setHrCardShown] = useState(false);
  const [emailAskShown, setEmailAskShown] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleLeadCaptured = (leadData: LeadData) => {
    setShowContactForm(false);
    setLeadCaptured(true);
    setInterestArea(leadData.interestArea || "");
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Thanks ${leadData.name}. I have your details and Ernst will follow up within 24 hours. Ask me anything else while you are here.`,
      },
    ]);
    toast({
      title: "Got it",
      description: "Your info was sent. You can keep chatting.",
    });
  };

  const handleSimpleContactSaved = (contactData: SimpleContactData) => {
    setShowSimpleContactForm(false);
    setLeadCaptured(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Thanks ${contactData.name}. I saved your contact for Ernst. Feel free to keep asking questions.`,
      },
    ]);
    toast({
      title: "Contact saved",
      description: "You can continue the conversation anytime.",
    });
  };

  const handleScheduleMeeting = () => {
    window.open(
      "https://calendly.com/ernstromain/meet-with-ernst",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 600));
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);
  };

  const saveQuickLead = async (email: string, nameHint?: string) => {
    try {
      const response = await callFunction("save-lead", {
        method: "POST",
        body: JSON.stringify({
          name: nameHint || email.split("@")[0],
          email,
          phone: null,
          company: null,
          jobTitle: null,
          message: "Shared email in chat",
          conversationSummary,
          interestArea: interestArea || "general",
          meetingRequested: false,
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setLeadCaptured(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Perfect — I have ${email}. Ernst can reach out from there. Keep chatting if you want more detail on anything.`,
        },
      ]);
      toast({ title: "Email saved", description: "Thanks — no more forms needed." });
    } catch {
      toast({
        title: "Could not save email",
        description: "Try the contact form instead.",
        variant: "destructive",
      });
      setShowSimpleContactForm(true);
    }
  };

  const streamChat = async (userMessage: string) => {
    const emailInMessage = extractEmail(userMessage);
    if (emailInMessage && !leadCaptured && emailAskShown) {
      const newMessages = [...messages, { role: "user" as const, content: userMessage }];
      setMessages(newMessages);
      setConversationCount((c) => c + 1);
      setConversationSummary((s) => `${s}\nUser: ${userMessage}`);
      setInput("");
      await saveQuickLead(emailInMessage);
      return;
    }

    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    const nextCount = conversationCount + 1;
    setConversationCount(nextCount);
    setIsLoading(true);

    const currentSummary = `${conversationSummary}\nUser: ${userMessage}`;
    setConversationSummary(currentSummary);

    const strongIntent = hasStrongContactIntent(userMessage);
    const hrIntent = hasStrongHrIntent(userMessage);

    try {
      const response = await callFunction("ai-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: newMessages,
          conversationSummary: currentSummary,
          leadAlreadyCaptured: leadCaptured,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(
            "I'm receiving too many requests right now. Please wait a moment and try again.",
          );
        }
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
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: assistantMessage,
                };
                return next;
              });
            }
          } catch {
            // ignore partial SSE JSON
          }
        }
      }

      // Single soft CTA path — never stack HR + contact + end prompts
      setMessages((prev) => {
        const next = [...prev];
        const last = { ...next[next.length - 1] };

        if (!leadCaptured && hrIntent && !hrCardShown) {
          last.showHrCard = true;
          setHrCardShown(true);
        } else if (!leadCaptured && strongIntent && !softOfferShown) {
          last.showSoftOffer = true;
          setSoftOfferShown(true);
        } else if (
          !leadCaptured &&
          !emailAskShown &&
          nextCount >= 6 &&
          !strongIntent
        ) {
          last.showEmailAsk = true;
          setEmailAskShown(true);
        }

        next[next.length - 1] = last;
        return next;
      });
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
    void streamChat(userMessage);
  };

  if (!isOpen) return null;

  return (
    <>
      {showContactForm && (
        <ContactForm
          onClose={() => setShowContactForm(false)}
          onLeadCaptured={handleLeadCaptured}
          conversationSummary={conversationSummary}
          interestArea={interestArea}
        />
      )}

      {showSimpleContactForm && (
        <SimpleContactForm
          onClose={() => setShowSimpleContactForm(false)}
          onContactSaved={handleSimpleContactSaved}
          conversationSummary={conversationSummary}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
        <Card className="w-full max-w-2xl h-[95vh] max-h-[800px] flex flex-col bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary/30 animate-glow-pulse flex-shrink-0">
                <img
                  src={profilePic}
                  alt="Ernst AI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground truncate">
                  Ernst AI
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  AI avatar · not live Ernst · chat as long as you want
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

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
                      <img
                        src={profilePic}
                        alt="Ernst AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/50"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.role === "assistant"
                        ? message.content
                            .replace(/\*\*/g, "")
                            .replace(/\*/g, "")
                            .replace(/^#+\s/gm, "")
                        : message.content}
                    </p>

                    {message.role === "assistant" && message.content && (
                      <button
                        type="button"
                        onClick={() => speak(message.content)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        aria-label="Listen to reply"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Listen
                      </button>
                    )}

                    {message.role === "assistant" && message.showHrCard && (
                      <HRTargeting
                        visible
                        onDismiss={() => {
                          setMessages((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], showHrCard: false };
                            return next;
                          });
                        }}
                        onContactRequest={() => setShowSimpleContactForm(true)}
                        onMeetingRequest={handleScheduleMeeting}
                      />
                    )}

                    {message.role === "assistant" && message.showSoftOffer && (
                      <div className="mt-3 p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                        <p className="text-sm text-foreground">
                          If useful, you can leave a note for Ernst or book a call. Or just keep
                          chatting.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            onClick={() => setShowSimpleContactForm(true)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Leave contact
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleScheduleMeeting}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Book a call
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMessages((prev) => {
                                const next = [...prev];
                                next[index] = {
                                  ...next[index],
                                  showSoftOffer: false,
                                };
                                return next;
                              });
                            }}
                          >
                            Keep chatting
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.role === "assistant" && message.showEmailAsk && (
                      <div className="mt-3 p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                        <p className="text-sm text-foreground flex items-start gap-2">
                          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Optional: drop your email in the chat if you want Ernst to follow up —
                          or ignore this and keep asking questions.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            value={pendingEmail}
                            onChange={(e) => setPendingEmail(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            disabled={!pendingEmail.includes("@")}
                            onClick={() => void saveQuickLead(pendingEmail.trim())}
                          >
                            Send
                          </Button>
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
                    <img
                      src={profilePic}
                      alt="Ernst AI"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={handleSubmit}
            className="p-3 sm:p-4 border-t border-border/50 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5"
          >
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
