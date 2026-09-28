import { db } from "~/db.server";

export interface LogWebhookInput {
  shop: string;
  topic: string;
  status?: string;
  statusCode?: number;
  latencyMs?: number;
  payload?: any;
}

export async function recordWebhookEvent({
  shop,
  topic,
  status = "SUCCESS",
  statusCode = 200,
  latencyMs,
  payload,
}: LogWebhookInput) {
  try {
    const payloadStr = payload ? JSON.stringify(payload).slice(0, 500) : null;
    await db.webhookLog.create({
      data: {
        shop,
        topic,
        status,
        statusCode,
        latencyMs,
        payload: payloadStr,
      },
    });
  } catch (err) {
    console.warn("[WebhookLog] Record notice:", err);
  }
}

export interface WebhookStatusItem {
  topic: string;
  label: string;
  status: string;
  hasFired: boolean;
  latency: string;
  lastDelivered: string;
  code: number | null;
}

export const MONITORED_WEBHOOK_TOPICS = [
  { topic: "products/create", label: "products/create", category: "Core Catalog" },
  { topic: "products/update", label: "products/update", category: "Core Catalog" },
  { topic: "inventory_levels/update", label: "inventory_levels/update", category: "Inventory" },
  { topic: "app/uninstalled", label: "app/uninstalled", category: "Lifecycle" },
  { topic: "customers/data_request", label: "customers/data_request (GDPR)", category: "GDPR Compliance" },
  { topic: "customers/redact", label: "customers/redact (GDPR)", category: "GDPR Compliance" },
  { topic: "shop/redact", label: "shop/redact (GDPR)", category: "GDPR Compliance" },
];

export async function getMonitoredWebhookStatuses(shop: string): Promise<WebhookStatusItem[]> {
  const logs = await db.webhookLog.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return MONITORED_WEBHOOK_TOPICS.map((item) => {
    const matchingLog = logs.find((l) => l.topic === item.topic || l.topic.startsWith(item.topic));

    if (!matchingLog) {
      return {
        topic: item.label,
        label: item.label,
        status: "STANDBY",
        hasFired: false,
        latency: "—",
        lastDelivered: "No events received yet",
        code: null,
      };
    }

    const elapsed = Date.now() - new Date(matchingLog.createdAt).getTime();
    let timeStr = "Just now";
    if (elapsed > 86400000) {
      timeStr = `${Math.floor(elapsed / 86400000)}d ago`;
    } else if (elapsed > 3600000) {
      timeStr = `${Math.floor(elapsed / 3600000)}h ago`;
    } else if (elapsed > 60000) {
      timeStr = `${Math.floor(elapsed / 60000)}m ago`;
    }

    return {
      topic: item.label,
      label: item.label,
      status: matchingLog.status,
      hasFired: true,
      latency: matchingLog.latencyMs ? `${matchingLog.latencyMs}ms` : "—",
      lastDelivered: timeStr,
      code: matchingLog.statusCode,
    };
  });
}
