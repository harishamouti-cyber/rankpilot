import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Refund & Cancellation Policy | RankPilot" },
    { name: "description", content: "RankPilot Refund, Trial, and Cancellation Policy." },
  ];
};

export default function RefundPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#202223", lineHeight: 1.6 }}>
      <header style={{ borderBottom: "1px solid #e1e3e5", paddingBottom: "24px", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>RankPilot Refund & Cancellation Policy</h1>
        <p style={{ color: "#6d7175", margin: 0, fontSize: "14px" }}>Last updated: September 2026</p>
      </header>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>1. Native Shopify Billing Overview</h2>
        <p>
          RankPilot uses Shopify's official Native App Billing API for all subscriptions and charges. All invoicing, payment collections, and renewals are handled directly through your standard Shopify merchant invoice.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>2. Free Trial Terms</h2>
        <p>
          Our <strong>Pro Plan ($49/month)</strong> includes an unrestricted <strong>7-Day Free Trial</strong>. During this 7-day trial period, you have full access to Google AI Overview spec matrices, conversational buyer FAQ generation, and AI citation tracking. If you cancel or uninstall before the 7-day trial expires, your Shopify account will never be charged.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>3. How to Cancel Your Subscription</h2>
        <p>You can cancel your RankPilot subscription at any time with zero penalty:</p>
        <ol>
          <li>Open your <strong>Shopify Admin</strong>.</li>
          <li>Navigate to <strong>Settings &gt; Apps and sales channels</strong>.</li>
          <li>Find <strong>RankPilot</strong> and click <strong>Uninstall</strong>.</li>
        </ol>
        <p>
          Uninstalling the App immediately stops any future recurring billing cycles through Shopify.
        </p>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>4. Refund Requests & Fair Dispute Handling</h2>
        <p>
          Because subscriptions are billed in advance on a recurring 30-day cycle via Shopify, fees are generally non-refundable once billed. However, we strive for 100% merchant satisfaction:
        </p>
        <ul>
          <li><strong>Accidental Renewal:</strong> If you intended to cancel but were charged upon renewal, contact us within 48 hours of the charge date, and we will issue an immediate refund credit through Shopify Partner billing.</li>
          <li><strong>Technical Disruptions:</strong> If you experience any persistent technical failure that our support team cannot resolve, we will issue a full refund credit for the impacted billing period.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>5. Contact Billing Support</h2>
        <p>
          For any billing inquiries, refund requests, or plan assistance, contact us directly:
          <br />
          <strong>Email:</strong> <a href="mailto:support@rankpilot.app" style={{ color: "#008060" }}>support@rankpilot.app</a>
          <br />
          We respond to all merchant inquiries within 24 business hours.
        </p>
      </section>
    </div>
  );
}
