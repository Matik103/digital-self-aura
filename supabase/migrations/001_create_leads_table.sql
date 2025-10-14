-- Create leads table for capturing contact information from AI chat interactions
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Contact Information
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    job_title VARCHAR(255),
    
    -- Lead Source & Context
    source VARCHAR(100) DEFAULT 'ai_chat',
    interest_area TEXT,
    message TEXT,
    conversation_summary TEXT,
    
    -- Lead Status & Follow-up
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'meeting_scheduled', 'converted', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    meeting_requested BOOLEAN DEFAULT FALSE,
    meeting_scheduled_at TIMESTAMP WITH TIME ZONE,
    meeting_notes TEXT,
    
    -- Additional Metadata
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    session_id VARCHAR(255),
    
    -- Timestamps
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_meeting_requested ON public.leads(meeting_requested);
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to insert leads (for the AI chat function)
CREATE POLICY "Service role can insert leads" ON public.leads
    FOR INSERT WITH CHECK (true);

-- Create policy for service role to read leads (for admin purposes)
CREATE POLICY "Service role can read leads" ON public.leads
    FOR SELECT USING (true);

-- Create policy for service role to update leads
CREATE POLICY "Service role can update leads" ON public.leads
    FOR UPDATE USING (true);
