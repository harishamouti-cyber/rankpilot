import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Support & Documentation | RankPilot" },
    { name: "description", content: "RankPilot Merchant Support and FAQ." },
  ];
};

export default function SupportPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#202223", lineHeight: 1.6 }}>
      <header style={{ borderBottom: "1px solid #e1e3e5", paddingBottom: "24px", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>RankPilot Merchant Support</h1>
        <p style={{ color: "#6d7175", margin: 0, fontSize: "14px" }}>We're here to help you dominate AI Search & Google AI Overviews.</p>
      </header>

      <section style={{ marginBottom: "32px", backgroundColor: "#f6f6f7", padding: "24px", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginTop: 0, marginBottom: "8px" }}>Need Immediate Help?</h2>
        <p style={{ margin: "0 0 16px 0" }}>Our dedicated Shopify partner support team responds within 24 business hours.</p>
        <p style={{ margin: 0 }}>
          <strong>Email:</strong> <a href="mailto:support@rankpilot.app" style={{ color: "#008060" }}>support@rankpilot.app</a>
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <details style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <summary style={{ fontWeight: "600", cursor: "pointer" }}>Does RankPilot affect my storefront speed?</summary>
            <p style={{ marginTop: "12px", marginBottom: 0, color: "#6d7175" }}>
              No. RankPilot operates 100% server-side via Shopify GraphQL and Metafields. Storefront blocks use pure HTML5 &lt;details&gt;/&lt;summary&gt; with 0ms JavaScript footprint.
            </p>
          </details>

          <details style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <summary style={{ fontWeight: "600", cursor: "pointer" }}>How do I roll back an optimization?</summary>
            <p style={{ marginTop: "12px", marginBottom: 0, color: "#6d7175" }}>
              Every optimization creates an automatic snapshot. Open the product in RankPilot, click "Revisions", and select "Rollback" to instantly restore previous data.
            </p>
          </details>

          <details style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <summary style={{ fontWeight: "600", cursor: "pointer" }}>What is Generative Engine Optimization (GEO)?</summary>
            <p style={{ marginTop: "12px", marginBottom: 0, color: "#6d7175" }}>
              GEO structures your product data so AI engines like Google AI Overviews, Perplexity, and ChatGPT Search can accurately parse, cite, and recommend your products.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
