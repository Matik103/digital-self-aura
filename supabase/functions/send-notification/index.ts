import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadNotification {
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  interestArea?: string;
  message?: string;
  meetingRequested: boolean;
  conversationSummary?: string;
  calendlyUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: LeadNotification = await req.json();
    
    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Lead from Ernst AI</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .lead-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .field { margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
          .cta-button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 15px 0;
          }
          .priority-high { border-left: 4px solid #ef4444; }
          .priority-medium { border-left: 4px solid #f59e0b; }
          .priority-low { border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Lead from Ernst AI</h1>
            <p>Someone wants to connect with you!</p>
          </div>
          
          <div class="content">
            <div class="lead-info ${leadData.meetingRequested ? 'priority-high' : 'priority-medium'}">
              <h2>Lead Information</h2>
              
              <div class="field">
                <span class="label">Name:</span>
                <span class="value">${leadData.name || 'Not provided'}</span>
              </div>
              
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${leadData.email}</span>
              </div>
              
              ${leadData.phone ? `
              <div class="field">
                <span class="label">Phone:</span>
                <span class="value">${leadData.phone}</span>
              </div>
              ` : ''}
              
              ${leadData.company ? `
              <div class="field">
                <span class="label">Company:</span>
                <span class="value">${leadData.company}</span>
              </div>
              ` : ''}
              
              ${leadData.jobTitle ? `
              <div class="field">
                <span class="label">Job Title:</span>
                <span class="value">${leadData.jobTitle}</span>
              </div>
              ` : ''}
              
              <div class="field">
                <span class="label">Interest Area:</span>
                <span class="value">${leadData.interestArea || 'General'}</span>
              </div>
              
              <div class="field">
                <span class="label">Meeting Requested:</span>
                <span class="value">${leadData.meetingRequested ? '✅ Yes' : '❌ No'}</span>
              </div>
              
              ${leadData.message ? `
              <div class="field">
                <span class="label">Message:</span>
                <span class="value">${leadData.message}</span>
              </div>
              ` : ''}
            </div>
            
            ${leadData.conversationSummary ? `
            <div class="lead-info">
              <h3>Conversation Summary</h3>
              <p style="white-space: pre-wrap; font-size: 14px; color: #6b7280;">${leadData.conversationSummary}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${leadData.calendlyUrl}" class="cta-button">
                📅 View in Calendly
              </a>
            </div>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3>Next Steps:</h3>
              <ul>
                <li>Check your Calendly for new bookings</li>
                <li>Follow up within 24 hours for best results</li>
                <li>Review the conversation summary for context</li>
                <li>Prepare relevant materials based on their interest area</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px;">
                This notification was sent from your Ernst AI lead generation system.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend (you can also use SendGrid, Mailgun, etc.)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping email notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Lead saved but email notification skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailPayload = {
      from: 'Ernst AI Leads <leads@erconsulting.tech>',
      to: ['intramaxx1@gmail.com', 'ernst@erconsulting.tech'],
      reply_to: 'ernst@erconsulting.tech',
      subject: `🎯 New Lead: ${leadData.name || 'Unknown'} - ${leadData.company || 'No Company'} - ${leadData.meetingRequested ? 'Meeting Requested' : 'Contact Only'}`,
      html: emailHtml,
    };

    console.log('Sending email with payload:', JSON.stringify(emailPayload));

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const responseData = await emailResponse.json();
    console.log('Resend API response:', JSON.stringify(responseData));

    if (!emailResponse.ok) {
      console.error('Email sending failed with status:', emailResponse.status);
      throw new Error(`Email sending failed: ${JSON.stringify(responseData)}`);
    }

    console.log('Email notification sent successfully to:', emailPayload.to.join(', '));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead saved and email notification sent',
        leadId: leadData.leadId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
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
