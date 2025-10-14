import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Building2, User, Mail, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MeetingScheduler, { MeetingData } from "./MeetingScheduler";

interface ContactFormProps {
  onClose: () => void;
  onLeadCaptured: (leadData: LeadData) => void;
  conversationSummary?: string;
  interestArea?: string;
}

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  interestArea?: string;
  message?: string;
  meetingRequested: boolean;
  preferredTime?: string;
  conversationSummary?: string;
}

const ContactForm = ({ onClose, onLeadCaptured, conversationSummary, interestArea }: ContactFormProps) => {
  const [formData, setFormData] = useState<LeadData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    interestArea: interestArea || "",
    message: "",
    meetingRequested: false,
    preferredTime: "",
    conversationSummary: conversationSummary || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save lead to database
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save lead");
      }

      onLeadCaptured(formData);
      
      toast({
        title: "Thank you!",
        description: "Your information has been saved. I'll be in touch soon!",
      });

      onClose();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LeadData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMeetingScheduled = (meetingData: MeetingData) => {
    // Update form data with meeting information
    setFormData(prev => ({
      ...prev,
      meetingRequested: true,
      preferredTime: meetingData.preferredTime,
    }));
    
    setShowMeetingScheduler(false);
    
    toast({
      title: "Meeting Request Added!",
      description: "Your meeting preferences have been saved.",
    });
  };

  return (
    <>
      {/* Meeting Scheduler Modal */}
      {showMeetingScheduler && (
        <MeetingScheduler
          onClose={() => setShowMeetingScheduler(false)}
          onMeetingScheduled={handleMeetingScheduled}
          leadName={formData.name}
          leadEmail={formData.email}
        />
      )}

      {/* Main Contact Form */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Let's Connect!</h2>
              <p className="text-sm text-muted-foreground">
                I'd love to learn more about your project and how I can help.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your.email@company.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  placeholder="e.g., HR Manager, CTO, Product Manager"
                />
              </div>
            </div>

            {/* Project Interest */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Project Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="interestArea">What are you interested in? *</Label>
                <Select
                  value={formData.interestArea}
                  onValueChange={(value) => handleInputChange("interestArea", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your interest area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-development">AI Development & Chatbots</SelectItem>
                    <SelectItem value="full-stack">Full-Stack Web Development</SelectItem>
                    <SelectItem value="mobile-apps">Mobile App Development</SelectItem>
                    <SelectItem value="consulting">Technical Consulting</SelectItem>
                    <SelectItem value="startup-advice">Startup Guidance</SelectItem>
                    <SelectItem value="automation">Process Automation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Tell me about your project</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Describe your project, challenges, or what you'd like to discuss..."
                  rows={4}
                />
              </div>
            </div>

            {/* Meeting Request */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Meeting Request
              </h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meetingRequested"
                  checked={formData.meetingRequested}
                  onCheckedChange={(checked) => handleInputChange("meetingRequested", checked as boolean)}
                />
                <Label htmlFor="meetingRequested" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I'd like to schedule a meeting to discuss this further
                </Label>
              </div>

              {formData.meetingRequested && (
                <div className="space-y-2">
                  <Label>Meeting Preferences</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formData.preferredTime ? `Preferred: ${formData.preferredTime}` : "Meeting requested"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMeetingScheduler(true)}
                      className="text-xs"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule Meeting
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email || !formData.interestArea}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? "Saving..." : "Send Information"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
      </div>
    </>
  );
};

export default ContactForm;
