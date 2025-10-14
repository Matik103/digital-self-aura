import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MeetingSchedulerProps {
  onClose: () => void;
  onMeetingScheduled: (meetingData: MeetingData) => void;
  leadName: string;
  leadEmail: string;
}

export interface MeetingData {
  leadName: string;
  leadEmail: string;
  meetingType: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  notes?: string;
}

const MeetingScheduler = ({ onClose, onMeetingScheduled, leadName, leadEmail }: MeetingSchedulerProps) => {
  const [meetingData, setMeetingData] = useState<MeetingData>({
    leadName,
    leadEmail,
    meetingType: "",
    preferredDate: "",
    preferredTime: "",
    timezone: "EST",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const meetingTypes = [
    { value: "technical-interview", label: "Technical Interview" },
    { value: "project-discussion", label: "Project Discussion" },
    { value: "consulting-call", label: "Consulting Call" },
    { value: "collaboration-meeting", label: "Collaboration Meeting" },
    { value: "general-inquiry", label: "General Inquiry" },
  ];

  const timeSlots = [
    { value: "morning", label: "Morning (9 AM - 12 PM)" },
    { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
    { value: "evening", label: "Evening (5 PM - 8 PM)" },
    { value: "flexible", label: "I'm flexible" },
  ];

  const timezones = [
    { value: "EST", label: "Eastern Time (EST)" },
    { value: "PST", label: "Pacific Time (PST)" },
    { value: "CST", label: "Central Time (CST)" },
    { value: "MST", label: "Mountain Time (MST)" },
    { value: "GMT", label: "Greenwich Mean Time (GMT)" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would typically send the meeting request to your backend
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      onMeetingScheduled(meetingData);
      
      toast({
        title: "Meeting Request Sent!",
        description: "I'll review your preferences and get back to you with available times.",
      });

      onClose();
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof MeetingData, value: string) => {
    setMeetingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md border-primary/30 shadow-glow-cyan">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Schedule a Meeting</h2>
              <p className="text-sm text-muted-foreground">
                Let's find a time that works for both of us
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meeting Type */}
            <div className="space-y-2">
              <Label htmlFor="meetingType">Meeting Type *</Label>
              <Select
                value={meetingData.meetingType}
                onValueChange={(value) => handleInputChange("meetingType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredDate">Preferred Date</Label>
                <input
                  id="preferredDate"
                  type="date"
                  value={meetingData.preferredDate}
                  onChange={(e) => handleInputChange("preferredDate", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select a date"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferredTime">Preferred Time</Label>
                <Select
                  value={meetingData.preferredTime}
                  onValueChange={(value) => handleInputChange("preferredTime", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Your Timezone *</Label>
              <Select
                value={meetingData.timezone}
                onValueChange={(value) => handleInputChange("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                value={meetingData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any specific topics you'd like to discuss or questions you have..."
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
              />
            </div>

            {/* Meeting Information */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                What to Expect
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Meeting duration: 30-60 minutes</li>
                <li>• Format: Video call (Google Meet/Zoom)</li>
                <li>• I'll send calendar invite with meeting link</li>
                <li>• Feel free to prepare any questions or project details</li>
              </ul>
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
                disabled={isSubmitting || !meetingData.meetingType || !meetingData.timezone}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? "Scheduling..." : "Request Meeting"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default MeetingScheduler;
