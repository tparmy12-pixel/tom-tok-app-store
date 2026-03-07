import React from "react";
import Layout from "@/components/Layout";
import { FileText } from "lucide-react";

const TermsConditions: React.FC = () => (
  <Layout>
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <FileText className="h-10 w-10 mx-auto mb-2 text-primary" />
        <h1 className="font-display text-3xl font-bold gradient-neon-text">Terms & Conditions</h1>
        <p className="text-muted-foreground mt-2">Last updated: March 7, 2026</p>
      </div>
      <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-foreground text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>By accessing and using Tom Tok Store, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">2. Use of Service</h2>
          <p>You may use our platform to discover, download, and use applications. You agree not to misuse the service or attempt to access it through unauthorized means.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">4. Content & Downloads</h2>
          <p>All apps available on Tom Tok Store are provided as-is. We do not guarantee the functionality, safety, or compatibility of third-party applications.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">5. Limitation of Liability</h2>
          <p>Tom Tok Store shall not be liable for any damages arising from the use or inability to use our services or any downloaded applications.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>
        </section>
      </div>
    </div>
  </Layout>
);

export default TermsConditions;
