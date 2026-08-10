import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Award, Building2, Calendar, MessageSquare } from "lucide-react";

interface HRTargetingProps {
  /** Parent already decided this session should show HR card once */
  visible: boolean;
  onDismiss: () => void;
  onContactRequest: () => void;
  onMeetingRequest: () => void;
}

/**
 * Shown at most once per session when strong HR intent is detected.
 */
const HRTargeting = ({
  visible,
  onDismiss,
  onContactRequest,
  onMeetingRequest,
}: HRTargetingProps) => {
  if (!visible) return null;

  return (
    <div className="mt-3 p-3 sm:p-4 rounded-lg border border-border/60 bg-muted/40">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-foreground">Hiring context</h4>
            <Badge variant="secondary" className="text-xs">
              Optional
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            If you are evaluating candidates, I can share a concise fit summary or you can
            book time with the real Ernst. No pressure either way.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-primary" />
              Proven shipped AI and product work
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Remote-first, globally available
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" onClick={onContactRequest}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Leave contact
            </Button>
            <Button size="sm" variant="outline" onClick={onMeetingRequest}>
              <Calendar className="w-4 h-4 mr-2" />
              Book interview
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Keep chatting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRTargeting;
