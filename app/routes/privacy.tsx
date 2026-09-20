import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | RankPilot" },
    { name: "description", content: "RankPilot GDPR and Privacy Policy." },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#202223", lineHeight: 1.6 }}>
      <header style={{ borderBottom: "1px solid #e1e3e5", paddingBottom: "24px", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>RankPilot Privacy Policy</h1>
        <p style={{ color: "#6d7175", margin: 0, fontSize: "14px" }}>Last updated: September 2026</p>
      </header>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>1. Overview & Zero Customer PII Commitment</h2>
        <p>
          RankPilot is an AI Search and Generative Engine Optimization (GEO) platform engineered exclusively for Shopify merchants.
          <strong> RankPilot does not collect, store, sell, or process any Personally Identifiable Information (PII) of your end customers.</strong>
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>2. Data We Process</h2>
        <p>RankPilot operates strictly upon public and merchant-owned product catalog metadata:</p>
        <ul>
          <li>Product titles, descriptions, categories, and tags</li>
          <li>Product inventory availability and pricing</li>
          <li>Structured Schema.org JSON-LD and custom metafields</li>
          <li>Search engine indexing logs (IndexNow submission records)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>3. GDPR & CCPA Compliance</h2>
        <p>
          RankPilot is fully integrated with Shopify's mandatory GDPR compliance webhooks:
        </p>
        <ul>
          <li><strong>customers/data_request:</strong> Acknowledged immediately (no customer PII is retained).</li>
          <li><strong>customers/redact:</strong> Acknowledged immediately.</li>
          <li><strong>shop/redact:</strong> 48 hours following app uninstallation, all store-related configuration, optimization history, and cached snapshots are permanently purged from our database.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>4. Data Security</h2>
        <p>
          All communications between your store and RankPilot are encrypted using industry-standard TLS 1.3 encryption. API keys and secrets are securely hashed and stored in compliant database storage.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>5. Contact Us</h2>
        <p>
          If you have any questions regarding this Privacy Policy, contact our privacy team at <a href="mailto:privacy@rankpilot.app" style={{ color: "#008060" }}>privacy@rankpilot.app</a>.
        </p>
      </section>
    </div>
  );
}
