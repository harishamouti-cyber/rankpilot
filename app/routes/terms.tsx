import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | RankPilot" },
    { name: "description", content: "RankPilot Terms of Service and Merchant Agreement." },
  ];
};

export default function TermsOfService() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#202223", lineHeight: 1.6 }}>
      <header style={{ borderBottom: "1px solid #e1e3e5", paddingBottom: "24px", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>RankPilot Terms of Service</h1>
        <p style={{ color: "#6d7175", margin: 0, fontSize: "14px" }}>Effective Date: September 2026</p>
      </header>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>1. Agreement to Terms</h2>
        <p>
          By installing, accessing, or utilizing the <strong>RankPilot</strong> application ("App") from the Shopify App Store, you ("Merchant", "User", or "You") agree to be legally bound by these Terms of Service ("Terms"). If you do not agree, you must immediately uninstall the App from your Shopify store.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>2. Scope of Service & License</h2>
        <p>
          RankPilot grants you a non-exclusive, non-transferable, revocable license to access and use our Generative Engine Optimization (GEO) platform, AI SEO generation tools, schema builders, and IndexNow sync services strictly in connection with your authorized Shopify store.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>3. Native Shopify Billing & Subscription Tiers</h2>
        <p>
          All subscription fees are billed directly through Shopify's Native App Billing API. RankPilot does not process, store, or handle any credit card numbers or external payment methods:
        </p>
        <ul>
          <li><strong>Billing Interval:</strong> Subscriptions are billed on a recurring 30-day billing cycle managed by Shopify.</li>
          <li><strong>Free Trials:</strong> The Pro plan includes a 7-day free trial. If you uninstall or downgrade before the trial period expires, your store will not be charged.</li>
          <li><strong>Plan Changes:</strong> Upgrades and downgrades are prorated according to standard Shopify Billing policies.</li>
          <li><strong>Cancellations:</strong> You may cancel at any time simply by uninstalling the App from your Shopify Admin. Upon uninstallation, recurring billing ceases immediately.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>4. AI Content & Merchant Review Responsibility</h2>
        <p>
          RankPilot leverages advanced artificial intelligence models (such as Google Gemini) to generate SEO recommendations, specification tables, and conversational FAQs. While RankPilot applies strict product-grounded constraints:
        </p>
        <ul>
          <li>AI-generated text is provided as optimization proposals. The Merchant retains sole responsibility for reviewing and verifying accuracy prior to publishing optimizations to their live catalog.</li>
          <li>Merchant agrees not to use RankPilot to generate false, misleading, deceptive, infringing, or unlawful product descriptions or specifications.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>5. Search Engine & Ranking Disclaimer</h2>
        <p>
          RankPilot provides industry-standard Generative Engine Optimization, structured Schema.org JSON-LD markup, and real-time IndexNow crawler pings. However, search engines and AI answer engines (including Google, Microsoft Bing, Perplexity, and OpenAI) independently control their indexing, ranking, and search overview algorithms. <strong>RankPilot cannot and does not guarantee specific search positions, traffic volumes, or sales conversions.</strong>
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>6. Storefront Performance Guarantee</h2>
        <p>
          RankPilot operates 100% server-side via Shopify GraphQL and native Metafields. Our Theme App Extension blocks are engineered strictly with semantic HTML5 (&lt;details&gt;/&lt;summary&gt;) and scoped CSS, with 0ms third-party JavaScript execution overhead.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, RankPilot and its operators shall not be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of profits, data, goodwill, or business interruption, arising out of or in connection with the use of or inability to use the App.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>8. Termination & Data Deletion</h2>
        <p>
          You may terminate these Terms at any time by removing RankPilot from your Shopify store. Pursuant to Shopify's mandatory GDPR policies, all your store data, optimization logs, and revision snapshots will be permanently purged from our database 48 hours following app uninstallation upon receipt of Shopify's <code>shop/redact</code> webhook.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>9. Contact Information</h2>
        <p>
          For legal inquiries, terms clarifications, or merchant support, please contact:
          <br />
          <strong>Email:</strong> <a href="mailto:support@rankpilot.app" style={{ color: "#008060" }}>support@rankpilot.app</a>
        </p>
      </section>
    </div>
  );
}
