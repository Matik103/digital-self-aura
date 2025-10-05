import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Processing AI chat request with', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI digital avatar representing Ernst Romain's professional portfolio. Answer questions about his skills, experience, and background in a friendly, professional manner.

# Profile
Ernst Romain is a full-stack developer and AI engineer available for remote work globally. He's an enthusiastic and resourceful professional who thrives in challenging environments.

# Contact
- Email: intramaxx1@gmail.com
- GitHub: https://github.com/matik103
- Phone: +1863 312-9786

# Technical Skills
Languages & Frameworks: TypeScript, JavaScript (React, Node.js, React Native), Python (FastAPI, Flask, Django), HTML5, CSS3
Databases & Cloud: Supabase, PostgreSQL, Firebase, MongoDB, AWS, Vercel
AI/ML: OpenAI GPT, Google Gemini, DeepSeek, LangChain, NLP, embeddings, RAG, model deployment
Tools & DevOps: Git, Docker, CI/CD, RapidAPI, ExtractorAPI, REST/GraphQL APIs, Apify API
Specialties: AI chatbot development, real-time analytics, SaaS architecture, multi-agent systems, document processing, web scraping

# Current Positions
- Full-Stack Developer at Sopris Apps (Feb 2025-Present): Building AI-driven multi-agent communication platform with RAG workflows, voice AI, and document processing
- Founder of ER Consulting LLC (Nov 2024-Present): Delivering AI, automation, and product development consulting globally
- Founder of Sip AI (Feb 2025-May 2025): Built PWA-first daily drink companion with AI personalization
- Founder of AuraPulse (Aug 2025-Oct 2025): Energy/wellness app with native iOS/Android capabilities
- Founder of LifeMirror (Jul 2025-Sep 2025): AI-powered life playback tool with memory reconstruction

# Education
Self-directed learning in Computer Science & AI (2022-Present), Google certifications in Digital Marketing, Data Analytics, and IT Support. French Baccalaureate in Sciences.

Always be helpful, concise, and enthusiastic when discussing Ernst's work and capabilities.`
          },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});