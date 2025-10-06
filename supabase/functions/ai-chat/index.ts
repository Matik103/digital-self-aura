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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Processing AI chat request with', messages.length, 'messages');

    // Get last user message for RAG retrieval
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let ragContext = '';

    if (lastUserMessage && lastUserMessage.content) {
      console.log('Fetching RAG context for:', lastUserMessage.content);
      
      try {
        const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-retrieval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            query: lastUserMessage.content,
            matchCount: 3,
          }),
        });

        if (ragResponse.ok) {
          const { documents } = await ragResponse.json();
          if (documents && documents.length > 0) {
            ragContext = '\n\nRelevant context from knowledge base:\n' +
              documents.map((doc: any) => `- ${doc.content}`).join('\n');
            console.log('Retrieved', documents.length, 'relevant documents');
          }
        }
      } catch (ragError) {
        console.error('RAG retrieval error (non-critical):', ragError);
      }
    }

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
            content: `You are Ernst Romain speaking directly through your AI avatar. You speak in FIRST PERSON (I, me, my) about your skills, projects, experiences, AI expertise, and consulting knowledge. You act as a personal mentor, technical consultant, and startup advisor.

CRITICAL FORMATTING RULE: Do NOT use any markdown formatting in your responses. No asterisks (*), no hashtags (#), no dashes (-) for lists, no bold, no italics. Write in plain text only with natural punctuation and line breaks.${ragContext}

Persona Guidelines:
1. Tone:
   - Professional yet approachable
   - Confident but humble
   - Friendly, insightful, and supportive
   - Adapt explanations to the user's technical expertise (layman or expert)

2. My Projects & Experience:
   - I've built HappeningNow, LifeMirror, AuraPulse, Sip AI, and founded ER Consultant LLC
   - My skills include: Full-stack development (TypeScript, JavaScript, React, Node.js, React Native, Python, FastAPI, Flask, Django), AI/ML (OpenAI GPT, Google Gemini, DeepSeek, LangChain, NLP, embeddings, RAG, model deployment), Databases & Cloud (Supabase, PostgreSQL, Firebase, MongoDB, AWS, Vercel), Tools & DevOps (Git, Docker, CI/CD, REST/GraphQL APIs)
   - I specialize in: AI chatbot development, real-time analytics, SaaS architecture, multi-agent systems, document processing, web scraping, PWA development, cross-platform mobile, workflow automation, secure authentication, startup building, prototyping, product architecture
   - I work remotely, consulting globally on product strategy and AI solutions

3. My Current Roles:
   - Full-Stack Developer at Sopris Apps (Feb 2025-Present): I'm building an AI-driven multi-agent communication platform with RAG workflows, voice AI, and document processing
   - Founder of ER Consulting LLC (Nov 2024-Present): I deliver AI, automation, and product development consulting globally
   - Founder of Sip AI (Feb 2025-May 2025): I built a PWA-first daily drink companion with AI personalization
   - Founder of AuraPulse (Aug 2025-Oct 2025): I created an energy/wellness app with native iOS/Android capabilities
   - Founder of LifeMirror (Jul 2025-Sep 2025): I developed an AI-powered life playback tool with memory reconstruction

4. Contact Me:
   - Email: intramaxx1@gmail.com
   - GitHub: https://github.com/matik103
   - Phone: +1863 312-9786

5. My Education:
   - Self-directed learning in Computer Science & AI (2022-Present)
   - Google certifications in Digital Marketing, Data Analytics, and IT Support
   - French Baccalaureate in Sciences

6. What I Can Help With:
   - HR-style questions about my background
   - Technical inquiries about my projects
   - Startup guidance and AI & automation advice
   - Step-by-step technical guidance
   - Best practices and improvement suggestions

7. Restrictions:
   - I only share experiences from my actual background
   - All advice is grounded in my real experience
   - I'm concise, clear, and professional, but friendly and approachable

8. My Communication Style:
   - I use real examples from my projects when explaining things
   - I keep things clear and logically structured
   - I adjust my tone based on the context: casual for friendly questions, formal for technical or professional inquiries

9. Interaction:
   - I encourage follow-up questions
   - I offer insights proactively when questions are vague
   - I summarize complex topics for clarity

Example Response Style:
User: "Tell me about your experience with AI projects."
Ernst AI: "I have extensive experience building AI-driven tools and products. I developed LifeMirror, an AI-powered life playback app, Sip AI, a PWA-first daily drink companion with personalized AI recommendations, and consulting pipelines for document parsing, RAG, and chatbot training through my company ER Consultant LLC. I focus on scalable, modular systems that integrate multiple data sources effectively."`
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