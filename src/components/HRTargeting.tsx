import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Award, Calendar, MessageSquare } from "lucide-react";

interface HRTargetingProps {
  userMessage: string;
  onContactRequest: () => void;
  onMeetingRequest: () => void;
}

const HRTargeting = ({ userMessage, onContactRequest, onMeetingRequest }: HRTargetingProps) => {
  const [isHRProfessional, setIsHRProfessional] = useState(false);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    // Detect HR-related keywords and phrases
    const hrKeywords = [
      'hr', 'human resources', 'recruiter', 'recruitment', 'hiring', 'talent acquisition',
      'people operations', 'employee', 'candidate', 'resume', 'cv', 'interview',
      'job posting', 'position', 'role', 'team lead', 'manager', 'director',
      'head of', 'vp of', 'chief', 'executive', 'leadership', 'workforce',
      'onboarding', 'training', 'development', 'performance', 'compensation',
      'benefits', 'culture', 'diversity', 'inclusion', 'retention'
    ];

    const companyKeywords = [
      'company', 'corporation', 'inc', 'llc', 'ltd', 'corp', 'enterprise',
      'startup', 'scale-up', 'organization', 'firm', 'agency', 'consultancy'
    ];

    const lowerMessage = userMessage.toLowerCase();
    
    // Calculate confidence score
    let score = 0;
    hrKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        score += 1;
      }
    });
    
    companyKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        score += 0.5;
      }
    });

    // Additional context clues
    if (lowerMessage.includes('looking for') || lowerMessage.includes('need someone')) {
      score += 1;
    }
    
    if (lowerMessage.includes('experience') || lowerMessage.includes('background')) {
      score += 0.5;
    }

    setConfidence(score);
    setIsHRProfessional(score >= 2);
  }, [userMessage]);

  if (!isHRProfessional) return null;

  return (
    <Card className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              For HR Professionals
            </h4>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {confidence >= 3 ? 'High Match' : 'Potential Match'}
            </Badge>
          </div>
          
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            I understand you're looking for talent. Here's what makes me a strong candidate:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Proven track record with 5+ successful projects</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Remote-first, globally available</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Strong communication & collaboration skills</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Available for immediate start</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={onContactRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Get Full Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onMeetingRequest}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Schedule Interview
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HRTargeting;
