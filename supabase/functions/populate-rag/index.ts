import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const knowledgeChunks = [
  // Profile & Contact
  {
    content: "Ernst Romain is an enthusiastic and resourceful full-stack developer and AI engineer available for remote work globally. He thrives in challenging environments and has strong problem-solving, analytical, and organizational skills. Skilled in end-to-end development from system design to launch across web, mobile, and cloud environments.",
    metadata: { category: "profile", type: "overview", priority: "high" }
  },
  {
    content: "Contact Information: Email is intramaxx1@gmail.com, GitHub profile at https://github.com/matik103, Phone number is +1863 312-9786. Available for remote work globally.",
    metadata: { category: "contact", type: "details", priority: "high" }
  },

  // Technical Skills - Detailed
  {
    content: "Programming Languages and Frameworks: TypeScript, JavaScript with extensive experience in React, Node.js, and React Native. Python development using FastAPI, Flask, and Django. Strong foundation in HTML5 and CSS3 for modern web development.",
    metadata: { category: "skills", type: "languages", priority: "high" }
  },
  {
    content: "Database and Cloud Expertise: Proficient in Supabase, PostgreSQL, Firebase, MongoDB. Cloud platforms include AWS and Vercel. Experienced in designing scalable database architectures and cloud deployments.",
    metadata: { category: "skills", type: "databases", priority: "high" }
  },
  {
    content: "AI and Machine Learning Capabilities: Expert in OpenAI GPT, Google Gemini, and DeepSeek models. Skilled in LangChain, Natural Language Processing, embeddings, Retrieval Augmented Generation systems, and model deployment. Experience with computer vision basics.",
    metadata: { category: "skills", type: "ai_ml", priority: "high" }
  },
  {
    content: "Development Tools and DevOps: Git version control, Docker containerization, CI/CD pipelines, RapidAPI, ExtractorAPI, REST and GraphQL API development, Apify API for web scraping and automation.",
    metadata: { category: "skills", type: "tools", priority: "medium" }
  },
  {
    content: "Core Specialties: AI chatbot development, real-time analytics systems, SaaS architecture design, multi-agent systems, document processing pipelines, web scraping, PWA development, cross-platform mobile applications, workflow automation, secure authentication implementation, startup building, rapid prototyping, and product architecture.",
    metadata: { category: "skills", type: "specialties", priority: "high" }
  },

  // Current Work Experience - Sopris Apps
  {
    content: "Sopris Apps Position - February 2025 to Present: Full-Stack Developer building an advanced AI-driven client-agent communication platform with multi-agent architecture. Platform enables businesses to deploy intelligent knowledge agents for customer support, automated information retrieval, and real-time decision-making.",
    metadata: { category: "experience", type: "current", company: "Sopris Apps", priority: "high" }
  },
  {
    content: "Sopris Apps Technical Implementation: Engineered scalable SaaS architecture using React with TypeScript frontend and Supabase with PostgreSQL backend. Implemented secure authentication, data storage, and role-based access control. Built Retrieval Augmented Generation workflows using vector databases for highly accurate, context-aware responses powered by OpenAI GPT and Google Gemini.",
    metadata: { category: "experience", type: "technical", company: "Sopris Apps", priority: "high" }
  },
  {
    content: "Sopris Apps AI Features: Developed orchestration logic for specialized AI agents handling document ingestion, semantic search, conversation flows, and task automation. Built voice AI agent with TTS and STT pipelines using OpenAI, Gemini, and custom voice models for natural human-like interactions. Integrated Apify API for automated web scraping and crawling to enrich AI training data.",
    metadata: { category: "experience", type: "ai_features", company: "Sopris Apps", priority: "high" }
  },
  {
    content: "Sopris Apps Admin Features: Designed real-time admin and client dashboards with live activity tracking, performance metrics, and conversation insights. Implemented advanced document parsing, classification, and semantic embedding for instant knowledge retrieval.",
    metadata: { category: "experience", type: "features", company: "Sopris Apps", priority: "medium" }
  },

  // Entrepreneurial Projects
  {
    content: "ER Consultant LLC - Founded November 2024 to Present: Delivering AI, automation, and product development consulting for clients worldwide. Helping startups and enterprises implement scalable solutions. Built end-to-end pipelines for document parsing, knowledge base creation, chatbot training, and AI-driven workflow automation. Registered LLC in Delaware, operating internationally across multiple time zones and industries.",
    metadata: { category: "projects", type: "consulting", company: "ER Consultant LLC", priority: "high" }
  },
  {
    content: "ER Consultant Services: Designed and deployed custom AI solutions integrating multiple data sources, APIs, and automation tools to streamline business operations. Provided strategic guidance on technology adoption, product roadmaps, and AI integration for enhanced decision-making and efficiency. Focused on scalable, maintainable architectures enabling clients to rapidly deploy AI and automation solutions.",
    metadata: { category: "projects", type: "consulting_services", company: "ER Consultant LLC", priority: "medium" }
  },
  {
    content: "LifeMirror Project - Founded November 2024: Created concept and prototype for AI-powered life playback tool combining passive tracking, emotional reflection, and memory recall. Designed platform architecture to capture and analyze behavioral, emotional, and contextual data for personalized insights. Implemented AI-driven algorithms for memory reconstruction, sentiment analysis, and pattern recognition. Focused on inclusivity as self-reflection and daily insight tool.",
    metadata: { category: "projects", type: "product", project: "LifeMirror", priority: "high" }
  },
  {
    content: "AuraPulse Project - Founded November 2024: Built energy and wellness app leveraging iOS and Android native capabilities with motion-sensor based interaction. Implemented secure Supabase authentication with universal deep linking. Designed scalable subdomain and callback architecture under aurapulse.erconsulting.tech. Configured custom DNS, iOS Universal Links, and Android App Links for seamless email verification.",
    metadata: { category: "projects", type: "product", project: "AuraPulse", priority: "high" }
  },
  {
    content: "Sip AI Project - Founded November 2024: Built PWA-first daily drink companion app integrating AI-driven personalization for hydration, wellness, and lifestyle engagement. Designed modular scalable architecture for cross-platform compatibility. Implemented AI algorithms for adaptive habit tracking, personalized reminders, and contextual drink suggestions. Developed analytics framework to capture user behavior.",
    metadata: { category: "projects", type: "product", project: "Sip AI", priority: "high" }
  },
  {
    content: "HappeningNow Project: A project focused on delivering real-time analytics and insights. Provides users with up-to-date information and data visualization capabilities.",
    metadata: { category: "projects", type: "product", project: "HappeningNow", priority: "medium" }
  },

  // Previous Work Experience
  {
    content: "Cognizant - Social Support Specialist (November 2022 to October 2024): Delivered technical support to Waze customers through social media channels using Conversocial. Responded to tickets adhering to SLA and TRT requirements. Utilized various tools for user management and issue investigation. Conducted sentiment analysis and moderated flagged posts. Skills included moderator capabilities, social media management, sentiment analysis, customer service, and multilingual support in French, English, and Spanish.",
    metadata: { category: "experience", type: "previous", company: "Cognizant", priority: "low" }
  },
  {
    content: "Autokey - Local SEO and GMB Specialist (October 2023 to December 2023): Managed Google My Business profile optimization for local search visibility. Oversaw business listings across citations and directories. Performed keyword research, content optimization, and reputation management. Developed local SEO strategy and location page strategy for Quebec market. Skills included technical SEO, citation building, and multilingual SEO.",
    metadata: { category: "experience", type: "previous", company: "Autokey", priority: "low" }
  },
  {
    content: "Napse - Application Support Specialist (May 2022 to January 2023): Primary liaison between users and company for standalone ERP application. Supported incident management and technology-related matters for payment business. Monitored application health status and investigated processing queries using SQL database queries. Skills included technical support, incident management, and application health monitoring.",
    metadata: { category: "experience", type: "previous", company: "Napse", priority: "low" }
  },
  {
    content: "Nazaries - Customer Support Agent (January 2021 to March 2022): Provided personalized B2B assistance to major clients including UEFA, Stade de France, Everton, and Liverpool using Europe's most popular ticketing system. Used technical skills for SQL queries and online payment troubleshooting. Multilingual support in English, French, and Spanish. Strong problem-solving and cross-functional collaboration.",
    metadata: { category: "experience", type: "previous", company: "Nazaries", priority: "low" }
  },

  // Education & Certifications
  {
    content: "Self-Directed Learning in Computer Science and AI (2022 to Present): Focused on applied development, startup building, and AI systems integration. Core areas include programming and web development (2022-2023), databases and cloud (2023), AI/ML and NLP (2023-2024), automation and APIs (2024), startup and product development (2024-2025).",
    metadata: { category: "education", type: "self_learning", priority: "high" }
  },
  {
    content: "Google Certifications: Completed Google Ads Search Certificate (July-August 2023) demonstrating proficiency in Google Ads Search campaigns. Completed Google Digital Marketing and E-Commerce Professional Certificate (May-July 2023) covering foundations of digital marketing. Completed Google Data Analytics Professional Certificate (March-June 2022) with over 100 hours of instruction. Completed Google IT Support Professional Certificate (October 2021 to March 2022).",
    metadata: { category: "education", type: "certifications", priority: "medium" }
  },
  {
    content: "SEMRush SEO Training (March 2024 to March 2025): Completed comprehensive SEMRush course learning to manage online visibility, optimize websites, and rank on Google. Mastered technical SEO, competitor analysis, backlink strategies, local SEO, and GMB listing optimization.",
    metadata: { category: "education", type: "specialized", priority: "low" }
  },
  {
    content: "Formal Education Background: Studied Economic and Social Administration at School of Law and Economic of Gonaives in Port-au-Prince, Haiti (September 2013 to November 2015). Holds French Baccalaureate Diploma in Sciences from Collège Mixte de Pétion-Ville, Haiti (September 2007 to June 2013). Completed Advanced English course at Caribbean English School achieving C1 Advanced level (February 2007 to September 2009).",
    metadata: { category: "education", type: "formal", priority: "low" }
  },

  // Languages
  {
    content: "Language Proficiency: Native speaker of French and Creole. Advanced professional level in English. Proficient in Spanish. Multilingual capabilities enable effective communication with global clients and teams.",
    metadata: { category: "skills", type: "languages", priority: "medium" }
  },

  // Professional Approach
  {
    content: "Professional Philosophy and Approach: Focuses on scalable, modular systems that integrate multiple data sources effectively. Emphasizes clean architecture and maintainable code. Values practical solutions over theoretical complexity. Strong believer in rapid iteration and prototyping. Designs infrastructure for fast deployment and future scalability.",
    metadata: { category: "approach", type: "philosophy", priority: "medium" }
  },
  {
    content: "Work Style and Strengths: Thrives in challenging environments and remote work settings. Excellent at global collaboration across time zones. Strong analytical and organizational skills. Quick learner who adapts to new technologies rapidly. Combines technical expertise with business understanding to deliver value-driven solutions.",
    metadata: { category: "approach", type: "work_style", priority: "medium" }
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
