import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Policy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Security & Data Protection Policy</h1>
        
        <div className="space-y-8 text-muted-foreground">
          {/* Last Updated */}
          <section>
            <p className="text-sm italic">Last Updated: January 2025</p>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Introduction</h2>
            <p>
              This website and all content, data, and intellectual property contained herein are owned by Ernst Romain. 
              This policy outlines prohibited activities and the consequences of violating these terms.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Prohibited Activities</h2>
            <p className="mb-4">The following activities are strictly prohibited:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Data Scraping & Unauthorized Collection:</strong> Automated extraction, scraping, copying, 
                or harvesting of any data, content, or information from this website without explicit written permission.
              </li>
              <li>
                <strong>Phishing & Impersonation:</strong> Using this website's content, branding, or information to 
                impersonate Ernst Romain or conduct phishing attacks, scams, or fraudulent activities.
              </li>
              <li>
                <strong>Unauthorized Commercial Use:</strong> Using any content, data, code, or intellectual property 
                from this website for commercial purposes without written authorization.
              </li>
              <li>
                <strong>Reverse Engineering:</strong> Attempting to reverse engineer, decompile, or extract source code 
                or proprietary information from this website or its AI systems.
              </li>
              <li>
                <strong>Malicious Activities:</strong> Hacking, injecting malicious code, conducting DDoS attacks, 
                or any activities intended to compromise the security or functionality of this website.
              </li>
              <li>
                <strong>Data Mining for Training AI Models:</strong> Using content from this website to train, fine-tune, 
                or develop AI models without explicit written permission.
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Intellectual Property Rights</h2>
            <p className="mb-4">
              All content on this website, including but not limited to text, images, code, design elements, 
              project descriptions, and AI-generated responses, is the intellectual property of Ernst Romain 
              and is protected by copyright and other applicable laws.
            </p>
            <p>
              Unauthorized reproduction, distribution, or use of any content is prohibited and may result in 
              legal action.
            </p>
          </section>

          {/* Reporting Violations */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Reporting Violations</h2>
            <p className="mb-4">
              If you discover any unauthorized use of this website's content or believe someone is conducting 
              prohibited activities, please report it immediately:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email: <a href="mailto:ernst@erconsulting.tech" className="text-primary hover:underline">ernst@erconsulting.tech</a></li>
              <li>Email: <a href="mailto:intramaxx1@gmail.com" className="text-primary hover:underline">intramaxx1@gmail.com</a></li>
            </ul>
          </section>

          {/* Legal Consequences */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Legal Consequences</h2>
            <p className="mb-4">
              Violations of this policy may result in:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Immediate termination of access to this website</li>
              <li>Civil litigation for damages and injunctive relief</li>
              <li>Criminal prosecution where applicable under local, state, federal, or international law</li>
              <li>Reporting to law enforcement and relevant authorities</li>
            </ul>
          </section>

          {/* Fair Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Fair Use & Permitted Activities</h2>
            <p className="mb-4">
              The following activities are permitted:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Viewing the website for personal, non-commercial informational purposes</li>
              <li>Sharing links to this website on social media or professional networks</li>
              <li>Contacting Ernst Romain for legitimate business inquiries or collaboration opportunities</li>
              <li>Using publicly displayed contact information (email, LinkedIn, GitHub) to reach out professionally</li>
            </ul>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Policy Modifications</h2>
            <p>
              Ernst Romain reserves the right to modify this policy at any time. Continued use of this website 
              constitutes acceptance of any changes. Users are encouraged to review this policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Contact Information</h2>
            <p className="mb-4">
              For questions about this policy or to request permission for specific use cases:
            </p>
            <ul className="space-y-1">
              <li>Email: <a href="mailto:ernst@erconsulting.tech" className="text-primary hover:underline">ernst@erconsulting.tech</a></li>
              <li>Email: <a href="mailto:intramaxx1@gmail.com" className="text-primary hover:underline">intramaxx1@gmail.com</a></li>
              <li>LinkedIn: <a href="https://linkedin.com/in/intramaxx1" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">linkedin.com/in/intramaxx1</a></li>
              <li>GitHub: <a href="https://github.com/matik103" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/matik103</a></li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-border/50 bg-card/30 backdrop-blur-sm mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2025 Ernst Romain. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Policy;
