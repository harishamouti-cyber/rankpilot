import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | RankPilot" },
    { name: "description", content: "RankPilot official GDPR, CCPA, and Data Privacy Policy for Shopify merchants." },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#202223", lineHeight: 1.6 }}>
      <header style={{ borderBottom: "1px solid #e1e3e5", paddingBottom: "24px", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>RankPilot Privacy Policy</h1>
        <p style={{ color: "#6d7175", margin: 0, fontSize: "14px" }}>Last updated: September 2026</p>
      </header>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>1. Introduction & Core Privacy Commitment</h2>
        <p>
          RankPilot ("we", "our", or "the App") provides an AI Search and Generative Engine Optimization (GEO) platform for Shopify merchants. We are deeply committed to safeguarding merchant privacy and transparency.
        </p>
        <div style={{ backgroundColor: "#f1f8f5", borderLeft: "4px solid #008060", padding: "16px 20px", borderRadius: "4px", margin: "16px 0" }}>
          <strong>Zero Customer PII Policy:</strong> RankPilot does not collect, track, store, sell, or process any Personally Identifiable Information (PII) of your end consumers (such as shopper names, physical addresses, credit card numbers, phone numbers, or emails). RankPilot operates solely upon public and merchant-approved product catalog metadata.
        </div>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>2. Information We Collect and Process</h2>
        <p>To deliver AI SEO and schema markup services, RankPilot accesses the following store-level data via authorized Shopify Admin GraphQL APIs:</p>
        <ul>
          <li><strong>Product Catalog Metadata:</strong> Product titles, descriptions, handles, product types, vendor names, tags, prices, and stock availability levels.</li>
          <li><strong>Custom Metafields:</strong> Custom structured schemas, specification matrices, and conversational buyer FAQ JSON arrays created by or managed within RankPilot.</li>
          <li><strong>Historical Snapshots:</strong> Prior product titles, descriptions, and metafields strictly used to power our 1-Click Rollback Snapshot feature.</li>
          <li><strong>Indexing Logs:</strong> URLs, timestamps, and HTTP response codes of real-time search engine submission pings sent to IndexNow (Bing, Yandex, etc.).</li>
          <li><strong>Store Information:</strong> Myshopify store domain, public store URL, and active subscription plan tier for billing verification.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>3. How We Use Your Data</h2>
        <p>The collected catalog data is strictly utilized for the following operational purposes:</p>
        <ul>
          <li>Generating AI-driven SEO titles, meta descriptions, high-density technical comparison tables, and conversational buyer FAQs.</li>
          <li>Constructing certified Schema.org JSON-LD structured data for Google AI Overviews and AI search engine grounding.</li>
          <li>Pinging search engine APIs (IndexNow) to accelerate crawl and re-indexing of catalog updates and restocks.</li>
          <li>Providing point-in-time version history snapshots so merchants can easily roll back content edits.</li>
          <li>Monitoring catalog health, inventory transitions, and schema drift prevention via 24/7 Autopilot.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>4. Third-Party Sub-Processors</h2>
        <p>RankPilot partners with industry-leading, enterprise-grade cloud infrastructure providers to provide our service:</p>
        <ul>
          <li><strong>Vercel Inc. (Hosting & Edge Functions):</strong> Cloud infrastructure used to run our server application with TLS 1.3 encryption.</li>
          <li><strong>Google Cloud Platform (Gemini AI API):</strong> Used solely to generate semantic product optimization recommendations. Prompt data submitted is never used to train public foundational AI models.</li>
          <li><strong>IndexNow (Microsoft Bing & Participating Search Engines):</strong> Receives product URLs to notify crawlers of newly published or restocked items.</li>
          <li><strong>Shopify Inc.:</strong> Powers app authentication, OAuth token exchange, and subscription billing.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>5. Mandatory Shopify GDPR Compliance & Webhook Handling</h2>
        <p>RankPilot strictly adheres to the European Union General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA):</p>
        <ul>
          <li><strong>Customer Data Request (<code>customers/data_request</code>):</strong> Acknowledged immediately. Because RankPilot stores zero end-customer PII, we certify that no customer data exists within our systems.</li>
          <li><strong>Customer Deletion (<code>customers/redact</code>):</strong> Acknowledged immediately. No customer records exist to redact.</li>
          <li><strong>Shop Deletion (<code>shop/redact</code>):</strong> Dispatched by Shopify 48 hours following app uninstallation. Upon receipt, RankPilot completely and permanently purges all store configurations, optimization history, revision snapshots, indexing logs, and sessions from our database.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>6. Storefront Cookies & Speed Impact</h2>
        <p>
          RankPilot does not place any tracking cookies, behavioral beacons, or analytical fingerprinting scripts on your customer storefront. Our Theme App Extension blocks are rendered using 100% server-side liquid templates with native HTML5 &lt;details&gt;/&lt;summary&gt; tags, ensuring zero script execution penalty and zero user tracking.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>7. Data Security Measures</h2>
        <p>
          All data in transit is encrypted using modern TLS 1.3 cryptography. All webhook communications from Shopify are cryptographically validated against your store's HMAC-SHA256 signature to prevent spoofing or unauthorized payload injection.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>8. Merchant Rights & Contact Information</h2>
        <p>
          Merchants may request access to, modification of, or complete deletion of their stored catalog snapshots at any time by contacting our privacy officer:
        </p>
        <p>
          <strong>Privacy Officer:</strong> RankPilot Data Protection Team
          <br />
          <strong>Email:</strong> <a href="mailto:privacy@rankpilot.app" style={{ color: "#008060" }}>privacy@rankpilot.app</a>
          <br />
          <strong>General Support:</strong> <a href="mailto:support@rankpilot.app" style={{ color: "#008060" }}>support@rankpilot.app</a>
        </p>
      </section>
    </div>
  );
}
