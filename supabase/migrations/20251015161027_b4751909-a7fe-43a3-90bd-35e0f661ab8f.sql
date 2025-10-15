-- Create enum types for lead status and priority
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'meeting_scheduled', 'converted', 'closed');
CREATE TYPE public.lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  source TEXT NOT NULL DEFAULT 'ai_chat',
  interest_area TEXT DEFAULT 'general',
  message TEXT,
  conversation_summary TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  meeting_requested BOOLEAN NOT NULL DEFAULT false,
  meeting_scheduled_at TIMESTAMP WITH TIME ZONE,
  meeting_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  session_id TEXT,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow service role (edge functions) to insert leads
CREATE POLICY "Service role can insert leads"
ON public.leads
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to read all leads
CREATE POLICY "Service role can read leads"
ON public.leads
FOR SELECT
TO service_role
USING (true);

-- Allow service role to update leads
CREATE POLICY "Service role can update leads"
ON public.leads
FOR UPDATE
TO service_role
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();