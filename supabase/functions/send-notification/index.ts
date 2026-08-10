import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  meetingRequested?: boolean;
  conversationSummary?: string;
  calendlyUrl?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildTelegramMessage(lead: LeadNotification): string {
  const lines = [
    "<b>New lead — Ernst AI</b>",
    "",
    `<b>Name:</b> ${escapeHtml(lead.name || "—")}`,
    `<b>Email:</b> ${escapeHtml(lead.email || "—")}`,
  ];
  if (lead.phone) lines.push(`<b>Phone:</b> ${escapeHtml(lead.phone)}`);
  if (lead.company) lines.push(`<b>Company:</b> ${escapeHtml(lead.company)}`);
  if (lead.jobTitle) lines.push(`<b>Title:</b> ${escapeHtml(lead.jobTitle)}`);
  lines.push(`<b>Interest:</b> ${escapeHtml(lead.interestArea || "general")}`);
  lines.push(
    `<b>Meeting:</b> ${lead.meetingRequested ? "Yes" : "No"}`,
  );
  if (lead.message) {
    lines.push("", `<b>Message:</b>`, escapeHtml(lead.message).slice(0, 800));
  }
  if (lead.conversationSummary) {
    lines.push(
      "",
      `<b>Chat summary:</b>`,
      escapeHtml(lead.conversationSummary).slice(0, 1200),
    );
  }
  if (lead.leadId) lines.push("", `<i>Lead ID:</i> <code>${escapeHtml(lead.leadId)}</code>`);
  if (lead.calendlyUrl) {
    lines.push("", `<a href="${escapeHtml(lead.calendlyUrl)}">Open Calendly</a>`);
  }
  return lines.join("\n");
}

async function sendTelegram(lead: LeadNotification): Promise<{
  sent: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    console.log("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping Telegram");
    return { sent: false, skipped: true };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramMessage(lead),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    console.error("Telegram send failed:", data);
    return {
      sent: false,
      error: typeof data.description === "string"
        ? data.description
        : `HTTP ${res.status}`,
    };
  }
  return { sent: true };
}

async function sendEmail(lead: LeadNotification): Promise<{
  sent: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return { sent: false, skipped: true };
  }

  const calendlyUrl =
    lead.calendlyUrl || "https://calendly.com/ernstromain/meet-with-ernst";
  const emailHtml = `
    <h2>New Lead from Ernst AI</h2>
    <p><b>Name:</b> ${lead.name || "—"}</p>
    <p><b>Email:</b> ${lead.email}</p>
    ${lead.phone ? `<p><b>Phone:</b> ${lead.phone}</p>` : ""}
    ${lead.company ? `<p><b>Company:</b> ${lead.company}</p>` : ""}
    ${lead.jobTitle ? `<p><b>Job Title:</b> ${lead.jobTitle}</p>` : ""}
    <p><b>Interest:</b> ${lead.interestArea || "general"}</p>
    <p><b>Meeting requested:</b> ${lead.meetingRequested ? "Yes" : "No"}</p>
    ${lead.message ? `<p><b>Message:</b><br/>${lead.message}</p>` : ""}
    ${
      lead.conversationSummary
        ? `<p><b>Conversation:</b><br/><pre>${lead.conversationSummary}</pre></p>`
        : ""
    }
    <p><a href="${calendlyUrl}">Calendly</a></p>
  `;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ernst AI Leads <leads@erconsulting.tech>",
      to: ["intramaxx1@gmail.com", "ernst@erconsulting.tech"],
      reply_to: "ernst@erconsulting.tech",
      subject: `New Lead: ${lead.name || "Unknown"} — ${
        lead.company || "No company"
      }`,
      html: emailHtml,
    }),
  });

  if (!emailResponse.ok) {
    const body = await emailResponse.text();
    return { sent: false, error: body.slice(0, 300) };
  }
  return { sent: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: LeadNotification = await req.json();

    const [telegram, email] = await Promise.all([
      sendTelegram(leadData).catch((e) => ({
        sent: false,
        error: e instanceof Error ? e.message : "telegram failed",
      })),
      sendEmail(leadData).catch((e) => ({
        sent: false,
        error: e instanceof Error ? e.message : "email failed",
      })),
    ]);

    console.log("Notifications:", { telegram, email });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: leadData.leadId,
        telegram,
        email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
