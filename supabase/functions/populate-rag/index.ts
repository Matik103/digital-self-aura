import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const knowledgeChunks = [
  {
    content: "Ernst Romain is a full-stack developer and AI engineer available for remote work globally. He is an enthusiastic and resourceful professional who thrives in challenging environments.",
    metadata: { category: "profile", type: "overview" }
  },
  {
    content: "Contact Information: Email is intramaxx1@gmail.com, GitHub profile at https://github.com/matik103, Phone number is +1863 312-9786",
    metadata: { category: "contact", type: "details" }
  },
  {
    content: "Technical Skills - Languages and Frameworks: TypeScript, JavaScript including React, Node.js, and React Native. Python with FastAPI, Flask, and Django. HTML5 and CSS3.",
    metadata: { category: "skills", type: "languages" }
  },
  {
    content: "Technical Skills - Databases and Cloud: Supabase, PostgreSQL, Firebase, MongoDB, AWS, and Vercel.",
    metadata: { category: "skills", type: "databases" }
  },
  {
    content: "Technical Skills - AI and Machine Learning: OpenAI GPT, Google Gemini, DeepSeek, LangChain, Natural Language Processing, embeddings, RAG systems, and model deployment.",
    metadata: { category: "skills", type: "ai_ml" }
  },
  {
    content: "Technical Skills - Tools and DevOps: Git, Docker, CI/CD pipelines, RapidAPI, ExtractorAPI, REST and GraphQL APIs, Apify API.",
    metadata: { category: "skills", type: "tools" }
  },
  {
    content: "Technical Specialties: AI chatbot development, real-time analytics, SaaS architecture, multi-agent systems, document processing, web scraping, PWA development, cross-platform mobile development, workflow automation, secure authentication, startup building, prototyping, and product architecture.",
    metadata: { category: "skills", type: "specialties" }
  },
  {
    content: "Current Position: Full-Stack Developer at Sopris Apps since February 2025. Building AI-driven multi-agent communication platform with RAG workflows, voice AI, and document processing capabilities.",
    metadata: { category: "experience", type: "current", company: "Sopris Apps" }
  },
  {
    content: "ER Consultant LLC: Founded in November 2024. Delivering AI, automation, and product development consulting services globally. Focuses on helping businesses implement cutting-edge AI solutions.",
    metadata: { category: "projects", type: "consulting", company: "ER Consultant LLC" }
  },
  {
    content: "Sip AI Project: Founded between February 2025 and May 2025. Built a PWA-first daily drink companion with AI personalization. Features intelligent recommendations based on user preferences and habits.",
    metadata: { category: "projects", type: "product", project: "Sip AI" }
  },
  {
    content: "AuraPulse Project: Founded between August 2025 and October 2025. Energy and wellness app with native iOS and Android capabilities. Focuses on helping users track and improve their energy levels and wellness.",
    metadata: { category: "projects", type: "product", project: "AuraPulse" }
  },
  {
    content: "LifeMirror Project: Founded between July 2025 and September 2025. AI-powered life playback tool with memory reconstruction capabilities. Helps users review and reflect on their life experiences.",
    metadata: { category: "projects", type: "product", project: "LifeMirror" }
  },
  {
    content: "HappeningNow Project: A project focused on delivering real-time analytics and insights. Provides users with up-to-date information and data visualization.",
    metadata: { category: "projects", type: "product", project: "HappeningNow" }
  },
  {
    content: "Education: Self-directed learning in Computer Science and AI from 2022 to Present. Completed Google certifications in Digital Marketing, Data Analytics, and IT Support. Holds French Baccalaureate in Sciences.",
    metadata: { category: "education", type: "background" }
  },
  {
    content: "Work Experience: Extensive experience with remote work, consulting, global collaboration, product strategy, and environmental threat detection systems. Skilled in working with distributed teams.",
    metadata: { category: "experience", type: "general" }
  },
  {
    content: "Professional Approach: Focuses on scalable, modular systems that integrate multiple data sources effectively. Emphasizes clean architecture and maintainable code. Values practical solutions over theoretical complexity.",
    metadata: { category: "approach", type: "philosophy" }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const EXTERNAL_SUPABASE_URL = 'https://kdvwovuusktvmkkyskba.supabase.co';
    const EXTERNAL_SUPABASE_SERVICE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    if (!EXTERNAL_SUPABASE_SERVICE_KEY) {
      throw new Error('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const externalSupabase = createClient(
      EXTERNAL_SUPABASE_URL,
      EXTERNAL_SUPABASE_SERVICE_KEY
    );

    console.log(`Processing ${knowledgeChunks.length} knowledge chunks...`);

    const results = [];

    for (const chunk of knowledgeChunks) {
      console.log(`Generating embedding for: ${chunk.content.substring(0, 50)}...`);

      // Generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: chunk.content,
        }),
      });

      if (!embeddingResponse.ok) {
        const error = await embeddingResponse.text();
        console.error('OpenAI embedding error:', error);
        throw new Error('Failed to generate embedding');
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      // Insert into external database
      const { data, error } = await externalSupabase
        .from('documents')
        .insert({
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: embedding,
        })
        .select();

      if (error) {
        console.error('Insert error:', error);
        results.push({ content: chunk.content, status: 'error', error: error.message });
      } else {
        console.log(`Successfully inserted: ${chunk.content.substring(0, 50)}...`);
        results.push({ content: chunk.content, status: 'success', id: data[0].id });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        message: `Populated RAG database with ${successCount} documents`,
        successCount,
        errorCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in populate-rag:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
