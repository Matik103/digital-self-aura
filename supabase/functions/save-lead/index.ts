import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const leadData = await req.json();
    
    // Extract client information
    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const referrer = req.headers.get('referer') || '';
    
    // Generate session ID if not provided
    const sessionId = leadData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine priority based on meeting request and company
    let priority = 'medium';
    if (leadData.meetingRequested) priority = 'high';
    if (leadData.company && (leadData.company.toLowerCase().includes('inc') || 
                            leadData.company.toLowerCase().includes('corp') || 
                            leadData.company.toLowerCase().includes('llc'))) {
      priority = 'high';
    }
    
    // Determine interest area for better categorization
    const interestArea = leadData.interestArea || 'general';
    
    const leadRecord = {
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone || null,
      company: leadData.company || null,
      job_title: leadData.jobTitle || null,
      source: 'ai_chat',
      interest_area: interestArea,
      message: leadData.message || null,
      conversation_summary: leadData.conversationSummary || null,
      status: 'new',
      priority: priority,
      meeting_requested: leadData.meetingRequested || false,
      meeting_scheduled_at: null,
      meeting_notes: null,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer_url: referrer,
      session_id: sessionId,
      last_contacted_at: null,
      converted_at: null
    };

    console.log('Saving lead:', leadRecord);

    const { data, error } = await supabase
      .from('leads')
      .insert([leadRecord])
      .select()
      .single();

    if (error) {
      console.error('Error saving lead:', error);
      throw new Error(`Failed to save lead: ${error.message}`);
    }

    console.log('Lead saved successfully:', data);

    // Send notification email
    try {
      const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          leadId: data.id,
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          company: leadData.company,
          jobTitle: leadData.job_title,
          interestArea: leadData.interest_area,
          message: leadData.message,
          meetingRequested: leadData.meeting_requested,
          conversationSummary: leadData.conversation_summary,
          calendlyUrl: 'https://calendly.com/ernstai/45min'
        }),
      });

      if (notificationResponse.ok) {
        console.log('Email notification sent successfully');
      } else {
        console.error('Email notification failed:', await notificationResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the lead save if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: data.id,
        message: 'Lead saved successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in save-lead function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
