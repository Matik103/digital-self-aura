import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  X,
  Send,
  User,
  Loader2,
  Calendar,
  MessageSquare,
  Mail,
  Volume2,
  Headphones,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ContactForm, { LeadData } from "./ContactForm";
import SimpleContactForm, { SimpleContactData } from "./SimpleContactForm";
import HRTargeting from "./HRTargeting";
import profilePic from "@/assets/profile-picture-edited.jpg";
import { callFunction } from "@/lib/functions";
import {
  extractEmail,
  hasFormRequestIntent,
  hasHandoffIntent,
  hasStrongContactIntent,
  hasStrongHrIntent,
} from "@/lib/chatIntent";
import { speakWithElevenLabs, stopSpeaking } from "@/lib/tts";

interface Message {
  role: "user" | "assistant" | "ernst" | "system";
  content: string;
  showSoftOffer?: boolean;
  showHrCard?: boolean;
  showEmailAsk?: boolean;
  remoteId?: string;
}

type HandoffState = {
  token: string;
  status: "waiting" | "active" | "closed";
};

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME =
  "Hi — I'm Ernst's AI avatar. Ask me about my skills, projects, or how I work. We can keep chatting as long as you like; only share contact details if you want a follow-up.";

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

  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [ttsLoadingKey, setTtsLoadingKey] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [handoffStarting, setHandoffStarting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenRemoteIds = useRef<Set<string>>(new Set());
  const pollAfterRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Poll Telegram ↔ web bridge while handoff is open
  useEffect(() => {
    if (!isOpen || !handoff || handoff.status === "closed") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await callFunction("handoff-relay", {
          method: "POST",
          body: JSON.stringify({
            action: "poll",
            token: handoff.token,
            after: pollAfterRef.current,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (data.messages || []) as Array<{
          id: string;
          role: "ernst" | "system";
          content: string;
          created_at: string;
        }>;

        if (data.status && data.status !== handoff.status) {
          setHandoff((h) => (h ? { ...h, status: data.status } : h));
        }

        if (!incoming.length) return;

        const fresh = incoming.filter((m) => !seenRemoteIds.current.has(m.id));
        for (const m of fresh) seenRemoteIds.current.add(m.id);
        const last = incoming[incoming.length - 1];
        if (last?.created_at) pollAfterRef.current = last.created_at;

        if (!fresh.length) return;

        setMessages((prev) => [
          ...prev,
          ...fresh.map((m) => ({
            role: m.role as Message["role"],
            content: m.content,
            remoteId: m.id,
          })),
        ]);
      } catch {
        // transient network — next tick retries
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isOpen, handoff]);

  // Lock page scroll + use visual viewport-friendly layout while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Warm TTS edge isolate so first Listen isn't a cold-start hit
    void fetch("/api/fn/tts", { method: "GET" }).catch(() => undefined);
    return () => {
      document.body.style.overflow = prev;
      stopSpeaking();
    };
  }, [isOpen]);

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

  const speak = (text: string, key: string) => {
    if (speakingKey === key || ttsLoadingKey === key) {
      stopSpeaking();
      setSpeakingKey(null);
      setTtsLoadingKey(null);
      return;
    }

    void speakWithElevenLabs(text, {
      onStart: () => {
        setTtsLoadingKey(key);
        // clear loading as soon as playback pipeline starts
        requestAnimationFrame(() => {
          setTtsLoadingKey(null);
          setSpeakingKey(key);
        });
      },
      onEnd: () => {
        setSpeakingKey(null);
        setTtsLoadingKey(null);
      },
      onError: (err) => {
        setSpeakingKey(null);
        setTtsLoadingKey(null);
        toast({
          title: "Could not play audio",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const startHandoff = async (transcript: Message[], triggerText?: string) => {
    if (handoffStarting) return;
    if (handoff && handoff.status !== "closed") return;
    setHandoffStarting(true);
    setIsLoading(true);
    try {
      const payloadMessages = [
        ...transcript
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
        ...(triggerText
          ? [{ role: "user" as const, content: triggerText }]
          : []),
      ];

      const res = await callFunction("request-handoff", {
        method: "POST",
        body: JSON.stringify({
          messages: payloadMessages,
          conversationSummary,
          visitorLabel: pendingEmail || "Website visitor",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not start live handoff");
      }

      seenRemoteIds.current = new Set();
      pollAfterRef.current = new Date().toISOString();
      setHandoff({ token: data.token, status: "waiting" });
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            "Connecting you to Ernst now. Stay in this chat — his replies will show up here. You can keep typing in the meantime.",
        },
      ]);
      toast({
        title: "Connected",
        description: "Ernst has been notified. Replies will appear here.",
      });
    } catch (error) {
      toast({
        title: "Could not connect to Ernst",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setHandoffStarting(false);
      setIsLoading(false);
    }
  };

  const sendHandoffMessage = async (userMessage: string) => {
    if (!handoff || handoff.status === "closed") return;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setConversationSummary((s) => `${s}\nUser: ${userMessage}`);
    setIsLoading(true);
    try {
      const res = await callFunction("handoff-relay", {
        method: "POST",
        body: JSON.stringify({
          action: "send",
          token: handoff.token,
          content: userMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }
      if (data.status === "closed") {
        setHandoff((h) => (h ? { ...h, status: "closed" } : h));
      }
    } catch (error) {
      toast({
        title: "Message not delivered",
        description:
          error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
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
    if (handoff && handoff.status !== "closed") {
      await sendHandoffMessage(userMessage);
      return;
    }

    if (hasHandoffIntent(userMessage)) {
      const withUser = [...messages, { role: "user" as const, content: userMessage }];
      setMessages(withUser);
      setInput("");
      setConversationCount((c) => c + 1);
      setConversationSummary((s) => `${s}\nUser: ${userMessage}`);
      await startHandoff(messages, userMessage);
      return;
    }

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
    const formIntent = hasFormRequestIntent(userMessage);
    const hrIntent = hasStrongHrIntent(userMessage);

    // Explicit form ask → open the form immediately (don't wait for CTA stack)
    if (!leadCaptured && formIntent) {
      setShowSimpleContactForm(true);
      setSoftOfferShown(true);
    }

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
          formIntent &&
          !softOfferShown
        ) {
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
    if (!input.trim() || isLoading || handoffStarting) return;
    const userMessage = input.trim();
    setInput("");
    void streamChat(userMessage);
  };

  const handoffLive = Boolean(handoff && handoff.status !== "closed");
  const subtitle = handoffLive
    ? handoff?.status === "waiting"
      ? "Live chat · connecting…"
      : "Live with Ernst"
    : "AI avatar · chat as long as you want";

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

      <div
        className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4 md:p-6 bg-background/80 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Ernst AI chat"
      >
        <Card
          className={[
            "flex w-full flex-col overflow-hidden bg-card/95 backdrop-blur-md",
            // Mobile: edge-to-edge sheet using dynamic viewport height
            "h-[100dvh] max-h-[100dvh] rounded-none border-0 shadow-none",
            // Tablet/desktop: centered modal
            "sm:h-[min(44rem,90dvh)] sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-primary/30 sm:shadow-glow-cyan",
            "md:max-w-2xl",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-between border-b border-border/50",
              "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10",
              "px-3 sm:px-4",
              "pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4",
              "pb-3 sm:pb-4",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary/30 animate-glow-pulse flex-shrink-0">
                <img
                  src={profilePic}
                  alt="Ernst AI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground truncate">
                  {handoffLive ? "Ernst" : "Ernst AI"}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-destructive/20 hover:text-destructive flex-shrink-0 h-10 w-10"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 pb-4">
              {messages.map((message, index) => {
                const isVisitor = message.role === "user";
                const isSystem = message.role === "system";
                const isErnstLive = message.role === "ernst";
                const isAi = message.role === "assistant";

                if (isSystem) {
                  return (
                    <div
                      key={message.remoteId || index}
                      className="flex justify-center animate-fade-in"
                    >
                      <p className="max-w-[92%] text-center text-[11px] sm:text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/40 border border-border/40">
                        {message.content}
                      </p>
                    </div>
                  );
                }

                return (
                <div
                  key={message.remoteId || index}
                  className={`flex gap-2 sm:gap-3 animate-fade-in ${
                    isVisitor ? "justify-end" : "justify-start"
                  }`}
                >
                  {(isAi || isErnstLive) && (
                    <div className="hidden sm:block w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
                      <img
                        src={profilePic}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[86%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:p-3 ${
                      isVisitor
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : isErnstLive
                          ? "bg-card border border-accent/40 rounded-bl-md"
                          : "bg-card border border-border/50 rounded-bl-md"
                    }`}
                  >
                    {isErnstLive && (
                      <p className="text-[10px] uppercase tracking-wide text-accent mb-1">
                        Ernst · live
                      </p>
                    )}
                    <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {isAi || isErnstLive
                        ? message.content
                            .replace(/\*\*/g, "")
                            .replace(/\*/g, "")
                            .replace(/^#+\s/gm, "")
                        : message.content}
                    </p>

                    {isAi && message.content && (
                      <button
                        type="button"
                        onClick={() => speak(message.content, `m-${index}`)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        aria-label={
                          speakingKey === `m-${index}`
                            ? "Stop audio"
                            : "Listen with Adam voice"
                        }
                      >
                        {ttsLoadingKey === `m-${index}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        {speakingKey === `m-${index}`
                          ? "Stop"
                          : ttsLoadingKey === `m-${index}`
                            ? "Starting…"
                            : "Listen"}
                      </button>
                    )}

                    {isAi && message.showHrCard && (
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

                    {isAi && message.showSoftOffer && (
                      <div className="mt-3 p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                        <p className="text-sm text-foreground">
                          Use the options below anytime — leave a note, book a call, or talk live.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => setShowSimpleContactForm(true)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Leave contact
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={handleScheduleMeeting}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Book a call
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={handoffStarting}
                            onClick={() => void startHandoff(messages)}
                          >
                            <Headphones className="w-4 h-4 mr-2" />
                            Talk to Ernst
                          </Button>
                        </div>
                      </div>
                    )}

                    {isAi && message.showEmailAsk && (
                      <div className="mt-3 p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                        <p className="text-sm text-foreground flex items-start gap-2">
                          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Optional: drop your email if you want Ernst to follow up — or keep
                          asking questions.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            value={pendingEmail}
                            onChange={(e) => setPendingEmail(e.target.value)}
                            className="text-sm min-w-0"
                            inputMode="email"
                            autoComplete="email"
                          />
                          <Button
                            size="sm"
                            className="w-full sm:w-auto shrink-0"
                            disabled={!pendingEmail.includes("@")}
                            onClick={() => void saveQuickLead(pendingEmail.trim())}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isVisitor && (
                    <div className="hidden sm:flex w-8 h-8 rounded-full bg-accent/20 items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-2 sm:gap-3 justify-start animate-fade-in">
                  <div className="hidden sm:block w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30">
                    <img
                      src={profilePic}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={handleSubmit}
            className={[
              "border-t border-border/50",
              "bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5",
              "px-3 sm:px-4 pt-3",
              "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4",
            ].join(" ")}
          >
            {!handoffLive && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {!leadCaptured && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => setShowSimpleContactForm(true)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Leave contact
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handleScheduleMeeting}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Book a call
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={handoffStarting || isLoading}
                  onClick={() => void startHandoff(messages)}
                >
                  {handoffStarting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Headphones className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Talk to Ernst
                </Button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  handoffLive
                    ? "Message Ernst…"
                    : "Ask me anything..."
                }
                disabled={isLoading || handoffStarting || handoff?.status === "closed"}
                className="flex-1 min-h-11 bg-input border-border/50 focus:border-primary text-base sm:text-sm"
                autoComplete="off"
                enterKeyHint="send"
              />
              <Button
                type="submit"
                disabled={
                  !input.trim() ||
                  isLoading ||
                  handoffStarting ||
                  handoff?.status === "closed"
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-cyan h-11 w-11 sm:w-auto sm:px-4 shrink-0"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
};

export default AIChat;
