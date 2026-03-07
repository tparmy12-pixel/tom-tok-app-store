import React from "react";
import Layout from "@/components/Layout";
import { Shield } from "lucide-react";

const PrivacyPolicy: React.FC = () => (
  <Layout>
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <Shield className="h-10 w-10 mx-auto mb-2 text-primary" />
        <h1 className="font-display text-3xl font-bold gradient-neon-text">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2">Last updated: March 7, 2026</p>
      </div>
      <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-foreground text-xl font-semibold">1. Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, and profile details when you create an account. We also collect usage data such as app downloads and interactions.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">2. How We Use Your Information</h2>
          <p>We use the information to provide and improve our services, personalize your experience, communicate with you, and ensure security of our platform.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">3. Data Sharing</h2>
          <p>We do not sell your personal information. We may share data with service providers who help us operate our platform, or when required by law.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">4. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
        </section>
        <section>
          <h2 className="text-foreground text-xl font-semibold">5. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us through our Contact page.</p>
        </section>
      </div>
    </div>
  </Layout>
);

export default PrivacyPolicy;
