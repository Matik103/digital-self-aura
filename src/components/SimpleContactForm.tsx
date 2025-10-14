import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, User, Mail, Building2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleContactFormProps {
  onClose: () => void;
  onContactSaved: (contactData: SimpleContactData) => void;
  conversationSummary?: string;
}

export interface SimpleContactData {
  name: string;
  email: string;
  company?: string;
  description?: string;
  conversationSummary?: string;
}

const SimpleContactForm = ({ onClose, onContactSaved, conversationSummary }: SimpleContactFormProps) => {
  const [formData, setFormData] = useState<SimpleContactData>({
    name: "",
    email: "",
    company: "",
    description: "",
    conversationSummary: conversationSummary || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save contact to database
      const requestData = {
        name: formData.name,
        email: formData.email,
        phone: null, // SimpleContactForm doesn't collect phone
        company: formData.company || null,
        jobTitle: null, // SimpleContactForm doesn't collect job title
        message: formData.description || null,
        conversationSummary: formData.conversationSummary,
        interestArea: "general",
        meetingRequested: false,
      };
      
      console.log("Sending contact data:", requestData);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Save contact error:", errorData);
        throw new Error(errorData.error || "Failed to save contact");
      }

      onContactSaved(formData);
      
      toast({
        title: "Thank you!",
        description: "Your contact information has been saved. I'll be in touch soon!",
      });

      onClose();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SimpleContactData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Share Contact Info</h2>
                <p className="text-sm text-muted-foreground">
                  Let's stay in touch!
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description/Note (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tell me about your project or what you'd like to discuss..."
                rows={3}
              />
            </div>

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
                disabled={isSubmitting || !formData.name || !formData.email}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? "Saving..." : "Save Contact"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default SimpleContactForm;
