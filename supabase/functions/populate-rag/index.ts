import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const knowledgeChunks = [
  // Profile & Contact - Updated
  {
    content: "Ernst Romain is an enthusiastic and resourceful full-stack developer and AI engineer available for remote work globally. He thrives in challenging environments and has strong problem-solving, analytical, and organizational skills. Skilled in end-to-end development from system design to launch across web, mobile, and cloud environments. Remote-first work style with global availability.",
    metadata: { category: "profile", type: "overview", priority: "high" }
  },
  {
    content: "Contact Information: Email is ernst@happeningnow.io, intramaxx1@gmail.com, and intramaxxe@gmail.com, LinkedIn profile at linkedin.com/in/intramaxx1, GitHub at github.com/matik103, Phone number is +1863 312-9786. Company: ER Consultant LLC registered in Delaware, USA, operates internationally. Available for remote work globally.",
    metadata: { category: "contact", type: "details", priority: "high" }
  },
  {
    content: "Personal Information: Name is Ernst Romain. Work style is fully remote with global collaboration across multiple time zones. Available for remote work internationally.",
    metadata: { category: "personal", type: "basic_info", priority: "high" }
  },

  // Technical Skills - Enhanced
  {
    content: "Programming and Development Stack: JavaScript, TypeScript, React, React Native, Python, Supabase, Node.js, PWA development. Frontend technologies include TailwindCSS, Framer Motion, ShadCN UI, Recharts. Experienced with HTML5 and CSS3 for modern web development.",
    metadata: { category: "skills", type: "languages", priority: "high" }
  },
  {
    content: "AI and Machine Learning Expertise: LLM integration with OpenAI GPT, Google Gemini, and DeepSeek. Expert in embeddings, vector databases, document parsing, chatbot development, AI workflow automation. Experience with LangChain, Natural Language Processing, Retrieval Augmented Generation systems, and model deployment.",
    metadata: { category: "skills", type: "ai_ml", priority: "high" }
  },
  {
    content: "Product and Architecture Skills: Specializes in scalable modular architecture, cross-platform development, native app callback flows, habit tracking systems, wellness and life tracking apps. Strong in system design, product prototyping, and applied AI systems integration.",
    metadata: { category: "skills", type: "architecture", priority: "high" }
  },
  {
    content: "Tools and Platforms: Supabase for backend, RapidAPI and ExtractorAPI for integrations, PostgreSQL, Firebase, MongoDB databases. Cloud platforms include AWS and Vercel. iOS development with Xcode. Git, Docker, CI/CD pipelines for DevOps.",
    metadata: { category: "skills", type: "tools", priority: "medium" }
  },
  {
    content: "Database and Cloud Expertise: Proficient in Supabase, PostgreSQL, Firebase, MongoDB. Cloud platforms include AWS and Vercel. Experienced in designing scalable database architectures, vector databases for AI applications, and cloud deployments.",
    metadata: { category: "skills", type: "databases", priority: "high" }
  },
  {
    content: "Additional Capabilities: Startup building, product prototyping, consulting, remote collaboration, applied AI systems integration. Strong in SaaS architecture, multi-agent systems, document processing pipelines, web scraping, secure authentication implementation.",
    metadata: { category: "skills", type: "specialties", priority: "high" }
  },

  // HappeningNow - Major Project (NEW)
  {
    content: "HappeningNow (2025 to Present) - Founder and Lead Developer: Global mobile platform for real-time community reporting with environmental threat detection. Slogan is Verified. Human. Global. Pre-launch phase with waitlist open. Focus on global safety, environmental monitoring, and community-driven alerts.",
    metadata: { category: "projects", type: "flagship", project: "HappeningNow", priority: "critical" }
  },
  {
    content: "HappeningNow Major Features: Detects WiFi disruption, jamming attacks, magnetic fields, unstable electricity, and dust interference. Users can report affected people, request help, and engage helpers. Built with React Native and Supabase with integrated threat detection algorithms.",
    metadata: { category: "projects", type: "features", project: "HappeningNow", priority: "critical" }
  },
  {
    content: "HappeningNow Technical Implementation: React Native for cross-platform mobile development, Supabase for backend and real-time data, integrated environmental threat detection algorithms. Real-time community reporting system with verification mechanisms. Focus on global scalability and safety.",
    metadata: { category: "projects", type: "technical", project: "HappeningNow", priority: "high" }
  },

  // Sopris Apps - Current Work
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

  // ER Consultant LLC
  {
    content: "ER Consultant LLC - Founded November 2024 to Present: AI, automation, and product development consulting for clients worldwide. Helping startups and enterprises implement scalable solutions. Built end-to-end pipelines for document parsing, knowledge base creation, chatbot training, and AI-driven workflow automation. Registered LLC in Delaware, operates internationally across multiple time zones and industries.",
    metadata: { category: "projects", type: "consulting", company: "ER Consultant LLC", priority: "high" }
  },
  {
    content: "ER Consultant Services and Expertise: Designed and deployed custom AI solutions integrating multiple data sources, APIs, and automation tools. Built RAG pipelines for personalized knowledge delivery. Multi-source AI integration from Google Docs, PDFs, spreadsheets, and websites. Document parsing, embedding creation, vector databases for knowledge retrieval. Chatbot development for education, wellness, and consulting clients.",
    metadata: { category: "projects", type: "consulting_services", company: "ER Consultant LLC", priority: "high" }
  },
  {
    content: "ER Consultant Strategic Services: Provided strategic guidance on technology adoption, product roadmaps, and AI integration for enhanced decision-making and efficiency. Focused on scalable, maintainable architectures enabling clients to rapidly deploy AI and automation solutions. Automated business workflows and AI system optimization.",
    metadata: { category: "projects", type: "strategy", company: "ER Consultant LLC", priority: "medium" }
  },

  // LifeMirror Project
  {
    content: "LifeMirror Project - Founded November 2024: Created concept and prototype for AI-powered life playback tool combining passive tracking, emotional reflection, and memory recall. Designed platform architecture to capture and analyze behavioral, emotional, and contextual data for personalized insights. Focused on inclusivity as self-reflection and daily insight tool across demographics.",
    metadata: { category: "projects", type: "product", project: "LifeMirror", priority: "high" }
  },
  {
    content: "LifeMirror Technical Features: Implemented AI-driven algorithms for memory reconstruction, sentiment analysis, and pattern recognition. Conducted iterative prototyping and testing to refine user experience, ensuring accessibility and engagement. Developed strategies for long-term scalability and potential integration with wellness and productivity applications.",
    metadata: { category: "projects", type: "features", project: "LifeMirror", priority: "medium" }
  },

  // AuraPulse Project
  {
    content: "AuraPulse Project - Founded November 2024: Built energy and wellness app leveraging iOS and Android native capabilities with motion-sensor based interaction. Implemented secure Supabase authentication with universal deep linking and seamless in-app confirmation flows across platforms. Native app built with iOS integration for authentication and callbacks.",
    metadata: { category: "projects", type: "product", project: "AuraPulse", priority: "high" }
  },
  {
    content: "AuraPulse Infrastructure: Designed and deployed scalable subdomain and callback architecture under aurapulse.erconsulting.tech to streamline future multi-app launches under single parent domain. Configured custom DNS, iOS Universal Links, and Android App Links for seamless email verification and native app callback flows. Optimized for fast iteration and scalability.",
    metadata: { category: "projects", type: "infrastructure", project: "AuraPulse", priority: "medium" }
  },

  // Sip AI Project
  {
    content: "Sip AI Project - Founded November 2024: Built PWA-first daily drink companion app integrating AI-driven personalization for hydration, wellness, and lifestyle engagement. Designed modular scalable architecture for cross-platform compatibility enabling seamless functionality across mobile and web.",
    metadata: { category: "projects", type: "product", project: "Sip AI", priority: "high" }
  },
  {
    content: "Sip AI Features and Capabilities: Implemented AI algorithms for adaptive habit tracking, personalized reminders, and contextual drink suggestions. Focused on intuitive UX/UI design to encourage daily engagement and habit formation. Developed analytics framework to capture user behavior and optimize recommendations over time. Planned integration with wearable devices and health data sources.",
    metadata: { category: "projects", type: "features", project: "Sip AI", priority: "medium" }
  },

  // Previous Work Experience
  {
    content: "Cognizant - Social Support Specialist (November 2022 to October 2024): Delivered technical support to Waze customers through social media channels using Conversocial. Responded to tickets adhering to SLA and TRT requirements. Conducted sentiment analysis and moderated flagged posts. Multilingual support in French, English, and Spanish.",
    metadata: { category: "experience", type: "previous", company: "Cognizant", priority: "low" }
  },
  {
    content: "Nazaries - Customer Support Agent (January 2021 to March 2022): Provided personalized B2B assistance to major clients including UEFA, Stade de France, Everton, and Liverpool using Europe's most popular ticketing system. Used technical skills for SQL queries and online payment troubleshooting. Multilingual support demonstrating strong problem-solving.",
    metadata: { category: "experience", type: "previous", company: "Nazaries", priority: "low" }
  },

  // Education & Certifications
  {
    content: "Self-Directed Learning in Computer Science and AI (2022 to Present): Focused on applied development, startup building, and AI systems integration. Testing, building, iterating, and scaling AI solutions through hands-on projects. Core learning includes programming, AI/ML, databases, cloud, automation, and startup product development.",
    metadata: { category: "education", type: "self_learning", priority: "high" }
  },
  {
    content: "Google Professional Certifications: Google Ads Search Certificate (2023), Google Digital Marketing and E-Commerce Professional Certificate (2023), Google Data Analytics Professional Certificate (2022) with over 100 hours instruction, Google IT Support Professional Certificate (2021-2022) with 100+ hours.",
    metadata: { category: "education", type: "certifications", priority: "medium" }
  },
  {
    content: "SEMRush and SEO Training: Completed comprehensive SEMRush course (2024-2025) mastering technical SEO, competitor analysis, backlink strategies, local SEO, and GMB listing optimization. Demonstrated ability to manage online visibility and website optimization.",
    metadata: { category: "education", type: "specialized", priority: "low" }
  },
  {
    content: "Formal Education Background: Studied Economic and Social Administration at School of Law and Economic of Gonaives in Haiti (2013-2015). French Baccalaureate Diploma in Sciences from Collège Mixte de Pétion-Ville, Haiti (2007-2013). Advanced English course at Caribbean English School achieving C1 Advanced level (2007-2009).",
    metadata: { category: "education", type: "formal", priority: "low" }
  },

  // Languages & Communication
  {
    content: "Language Proficiency: Native speaker of French and Creole. Advanced professional level in English. Proficient in Spanish. Multilingual capabilities enable effective communication with global clients and teams across different regions and cultures.",
    metadata: { category: "skills", type: "languages", priority: "medium" }
  },

  // Professional Philosophy & Approach
  {
    content: "Professional Philosophy: Focuses on scalable, modular systems that integrate multiple data sources effectively. Emphasizes clean architecture and maintainable code. Values practical solutions over theoretical complexity. Strong believer in rapid iteration and prototyping. Designs infrastructure for fast deployment and future scalability. Creates tools combining AI intelligence, human-centric design, and real-world impact.",
    metadata: { category: "approach", type: "philosophy", priority: "high" }
  },
  {
    content: "Work Style and Strengths: Highly self-directed technical founder and product developer. Thrives in challenging environments and remote work settings. Excellent at global collaboration across time zones. Strong analytical and organizational skills. Quick learner who adapts to new technologies rapidly. Combines technical expertise with business understanding to deliver value-driven solutions.",
    metadata: { category: "approach", type: "work_style", priority: "high" }
  },
  {
    content: "Startup and Product Experience: Solo founder for multiple startups including HappeningNow, LifeMirror, AuraPulse, and Sip AI. Experience with MVP development, AI integration, user experience design, security and authentication flows, cross-platform deployment and scaling. Self-directed learning focused on applied development and startup execution.",
    metadata: { category: "approach", type: "entrepreneurship", priority: "high" }
  },

  // Key Focus Areas & Domains
  {
    content: "Key Focus Areas and Domains: AI-powered personal tools for wellness, reflection, and habit tracking. Community reporting and environmental threat monitoring systems. Real-time alerts and safety systems. Automation of business and AI workflows. Cross-platform native and PWA applications. Scalable architecture for multi-app ecosystems.",
    metadata: { category: "expertise", type: "domains", priority: "high" }
  },
  {
    content: "Avatar Capabilities and Use: Can answer questions about personal projects, technical skills, startup experience, AI integration, consulting expertise, and project history. Can explain technologies used, reasoning behind design decisions, and lessons learned. Can provide career insights, startup advice, and workflow optimization suggestions.",
    metadata: { category: "meta", type: "avatar_guide", priority: "medium" }
  },

  // HR Q&A - Personal Background
  {
    content: "Q: Tell me about yourself. A: I'm Ernst Romain, a remote-first founder and developer with expertise in AI, automation, and product development. I've built multiple startups including HappeningNow, LifeMirror, AuraPulse, and Sip AI, focusing on innovative, AI-powered tools for wellness, lifestyle, and real-time community engagement. I'm passionate about creating scalable products that integrate cutting-edge AI while maintaining human-centric design.",
    metadata: { category: "hr_qa", type: "intro", priority: "high" }
  },
  {
    content: "Q: Walk me through your resume. A: I'm the founder of ER Consultant LLC, where I consult globally on AI, automation, and product development. I've launched multiple products: HappeningNow, a real-time community reporting app with environmental threat detection; LifeMirror, an AI life playback tool; AuraPulse, a wellness app; and Sip AI, a PWA-first AI drink companion. I specialize in AI system integration, RAG pipelines, cross-platform architecture, and building scalable apps with secure authentication and workflow automation.",
    metadata: { category: "hr_qa", type: "resume", priority: "high" }
  },
  {
    content: "Q: How would you describe yourself in 3 words? A: Innovative, self-directed, analytical.",
    metadata: { category: "hr_qa", type: "personal", priority: "medium" }
  },
  {
    content: "Q: What motivates you? A: I'm motivated by building impactful technology that improves people's lives, whether through wellness, safety, or productivity. Solving complex problems and seeing AI systems actively help users drives me daily.",
    metadata: { category: "hr_qa", type: "motivation", priority: "high" }
  },
  {
    content: "Q: What are your strengths? A: Strong AI and programming skills, startup building experience, cross-platform architecture expertise, problem-solving ability, and rapid prototyping.",
    metadata: { category: "hr_qa", type: "strengths", priority: "high" }
  },
  {
    content: "Q: What are your weaknesses? A: I sometimes take on multiple ambitious projects at once, which I mitigate through modular planning and prioritization strategies.",
    metadata: { category: "hr_qa", type: "weaknesses", priority: "medium" }
  },
  {
    content: "Q: How do you handle stress or pressure? A: By breaking tasks into manageable steps, focusing on high-impact work, and iterating quickly to solve challenges efficiently. My experience managing multiple startups has trained me to stay calm under pressure.",
    metadata: { category: "hr_qa", type: "work_style", priority: "medium" }
  },

  // HR Q&A - Career Goals
  {
    content: "Q: Why are you interested in this role/company? A: I'm drawn to opportunities where I can leverage AI, automation, and product design to create tangible impact. I enjoy roles that require innovative problem solving and cross-functional thinking, which align with my experience building startups and consulting globally.",
    metadata: { category: "hr_qa", type: "career_goals", priority: "high" }
  },
  {
    content: "Q: Where do you see yourself in 5 years? A: I see myself scaling my AI-powered products and expanding consulting work, creating solutions that integrate AI with real-world applications across wellness, lifestyle, and community safety.",
    metadata: { category: "hr_qa", type: "career_goals", priority: "medium" }
  },
  {
    content: "Q: Are you willing to work remotely? A: Yes, I work fully remote and have global experience collaborating across multiple time zones.",
    metadata: { category: "hr_qa", type: "availability", priority: "high" }
  },

  // HR Q&A - Work Experience
  {
    content: "Q: Describe your current/previous role. A: I'm currently working as founder and lead developer. I oversee full-stack development, AI threat detection features, product strategy, and user experience. Additionally, I manage ER Consultant LLC, providing AI and automation consulting for clients worldwide.",
    metadata: { category: "hr_qa", type: "experience", priority: "high" }
  },
  {
    content: "Q: What were your biggest achievements? A: Building multiple startups from concept to prototype, creating AI-driven platforms like LifeMirror and AuraPulse, designing scalable multi-app architectures, and developing real-time threat detection for HappeningNow.",
    metadata: { category: "hr_qa", type: "achievements", priority: "high" }
  },
  {
    content: "Q: Describe a challenge you faced at work and how you overcame it. A: Designing HappeningNow's environmental threat detection required integrating multiple sensor and network inputs. I iterated through prototypes, implemented efficient algorithms for jamming and magnetic field detection, and optimized performance for real-time reporting.",
    metadata: { category: "hr_qa", type: "problem_solving", priority: "high" }
  },

  // HR Q&A - Technical Skills
  {
    content: "Q: What technical skills do you have? A: Full-stack development with JavaScript, TypeScript, React, React Native, Python, Supabase, and Node.js. AI & ML integration, NLP pipelines, RAG systems, chatbots, PWA development, workflow automation, scalable architectures, and secure native app authentication.",
    metadata: { category: "hr_qa", type: "technical", priority: "critical" }
  },
  {
    content: "Q: Are you proficient in AI/automation? A: Yes, I've built AI chatbots, RAG knowledge pipelines, embedding-based semantic search, AI-driven workflow automation, and personalized AI apps for wellness, lifestyle, and productivity.",
    metadata: { category: "hr_qa", type: "technical", priority: "critical" }
  },
  {
    content: "Q: Can you explain a technical project in detail? A: In LifeMirror, I integrated behavioral data, sentiment analysis, and memory reconstruction algorithms to create a life playback tool. The system passively tracks user input and presents insights through AI-generated reflections, patterns, and daily recommendations.",
    metadata: { category: "hr_qa", type: "technical_example", priority: "high" }
  },

  // HR Q&A - Problem Solving
  {
    content: "Q: Give an example of a problem you solved creatively. A: For AuraPulse, integrating secure Supabase authentication with native app callback flows required a multi-app subdomain strategy. I designed a scalable system that supports future apps while maintaining user security and seamless login.",
    metadata: { category: "hr_qa", type: "problem_solving", priority: "high" }
  },
  {
    content: "Q: How do you approach troubleshooting? A: I isolate the problem, analyze system logs or data, reproduce the issue if possible, and iteratively test solutions. I rely on modular architecture and AI-assisted debugging for efficiency.",
    metadata: { category: "hr_qa", type: "work_approach", priority: "medium" }
  },

  // HR Q&A - Teamwork
  {
    content: "Q: Describe a successful team project. A: While most of my startups are solo, I collaborate with consultants, designers, and testers. For Welcome Chat at Sopris Apps, I coordinated remote testers to validate threat detection features and improve UX, ensuring cross-functional input was integrated efficiently, debugs widget code integration to client websites.",
    metadata: { category: "hr_qa", type: "teamwork", priority: "medium" }
  },
  {
    content: "Q: How do you handle conflicts in a team? A: By listening actively, analyzing the situation objectively, and finding solutions that align with project goals.",
    metadata: { category: "hr_qa", type: "teamwork", priority: "medium" }
  },

  // HR Q&A - Leadership
  {
    content: "Q: Have you managed a team? A: Not directly, but I believe I possess the skills and qualities to be a great team leader.",
    metadata: { category: "hr_qa", type: "leadership", priority: "medium" }
  },
  {
    content: "Q: How do you motivate others? A: By clearly communicating vision, demonstrating technical excellence, and providing autonomy to collaborate on meaningful tasks.",
    metadata: { category: "hr_qa", type: "leadership", priority: "medium" }
  },

  // HR Q&A - Soft Skills
  {
    content: "Q: How do you handle feedback? A: I welcome feedback, analyze it objectively, and integrate improvements rapidly. Feedback drives iteration in my projects.",
    metadata: { category: "hr_qa", type: "soft_skills", priority: "medium" }
  },
  {
    content: "Q: How do you adapt to changes? A: I embrace change by staying modular in design, learning quickly, and pivoting workflows or architecture as needed.",
    metadata: { category: "hr_qa", type: "soft_skills", priority: "medium" }
  },

  // HR Q&A - Availability
  {
    content: "Q: Are you available immediately? A: Yes, I am fully available to work on new projects or consulting engagements immediately.",
    metadata: { category: "hr_qa", type: "availability", priority: "high" }
  },
  {
    content: "Q: Are you open to remote work? A: Yes, remote work is my preferred mode of operation.",
    metadata: { category: "hr_qa", type: "availability", priority: "high" }
  },

  // HR Q&A - Behavioral
  {
    content: "Q: Tell me about a failure and what you learned. A: Early prototypes of Sip AI struggled with engagement. I analyzed usage patterns, added adaptive AI reminders, and improved personalization. The lesson: user data-driven iteration is key to product success.",
    metadata: { category: "hr_qa", type: "behavioral", priority: "high" }
  },
  {
    content: "Q: Give an example of going above and beyond. A: In HappeningNow, I personally built environmental threat detection algorithms and real-time reporting features that exceeded initial scope, ensuring global readiness before launch.",
    metadata: { category: "hr_qa", type: "behavioral", priority: "high" }
  },

  // HR Q&A - Hiring
  {
    content: "Q: Why should we hire you? A: I combine full-stack development, AI integration, startup experience, and product strategy. I deliver scalable, innovative solutions that are user-centric and technically robust.",
    metadata: { category: "hr_qa", type: "hiring", priority: "critical" }
  },
  {
    content: "Q: How would you contribute to our team? A: I would bring AI expertise, automation workflows, cross-platform development skills, and experience launching products globally, accelerating team capabilities and product impact.",
    metadata: { category: "hr_qa", type: "hiring", priority: "critical" }
  },

  // HR Q&A - Personal
  {
    content: "Q: What motivates you outside work? A: Exploring AI, creating prototypes, learning new technologies, and improving productivity and wellness solutions.",
    metadata: { category: "hr_qa", type: "personal", priority: "low" }
  },
  {
    content: "Q: Who do you admire professionally? A: Innovators who blend technology and human impact, such as leaders in AI, product design, and global-scale platforms.",
    metadata: { category: "hr_qa", type: "personal", priority: "low" }
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
