import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  Session,
} from "@shopify/shopify-app-remix/server";
import { SessionStorage } from "@shopify/shopify-app-session-storage";
import { db } from "./db.server";

const memorySessionCache = new Map<string, Session>();

export function clearSessionCache(shop?: string) {
  if (shop) {
    for (const [id, session] of memorySessionCache.entries()) {
      if (session.shop === shop) {
        memorySessionCache.delete(id);
      }
    }
  } else {
    memorySessionCache.clear();
  }
}

class PrismaSessionStorageAdapter implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    memorySessionCache.set(session.id, session);

    const data = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope,
      expires: session.expires,
      accessToken: session.accessToken || "",
      userId: session.onlineAccessInfo?.associated_user?.id
        ? BigInt(session.onlineAccessInfo.associated_user.id)
        : null,
      firstName: session.onlineAccessInfo?.associated_user?.first_name || null,
      lastName: session.onlineAccessInfo?.associated_user?.last_name || null,
      email: session.onlineAccessInfo?.associated_user?.email || null,
      accountOwner: session.onlineAccessInfo?.associated_user?.account_owner || false,
      locale: session.onlineAccessInfo?.associated_user?.locale || null,
      collaborator: session.onlineAccessInfo?.associated_user?.collaborator || false,
      emailVerified: session.onlineAccessInfo?.associated_user?.email_verified || false,
    };

    try {
      await db.session.upsert({
        where: { id: session.id },
        create: data,
        update: data,
      });
    } catch (e) {
      console.warn("[SessionStorage] SQLite upsert warning:", e);
    }

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const memoryCached = memorySessionCache.get(id);
    if (memoryCached) return memoryCached;

    try {
      const record = await db.session.findUnique({ where: { id } });
      if (!record) return undefined;

      const session = new Session({
        id: record.id,
        shop: record.shop,
        state: record.state,
        isOnline: record.isOnline,
      });

      session.scope = record.scope || undefined;
      session.expires = record.expires || undefined;
      session.accessToken = record.accessToken;

      memorySessionCache.set(session.id, session);
      return session;
    } catch {
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    memorySessionCache.delete(id);
    try {
      await db.session.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    for (const id of ids) {
      memorySessionCache.delete(id);
    }
    try {
      await db.session.deleteMany({ where: { id: { in: ids } } });
      return true;
    } catch {
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const inMemory = Array.from(memorySessionCache.values()).filter((s) => s.shop === shop);
    if (inMemory.length > 0) return inMemory;

    try {
      const records = await db.session.findMany({ where: { shop } });
      return records.map((record) => {
        const session = new Session({
          id: record.id,
          shop: record.shop,
          state: record.state,
          isOnline: record.isOnline,
        });
        session.scope = record.scope || undefined;
        session.expires = record.expires || undefined;
        session.accessToken = record.accessToken;
        memorySessionCache.set(session.id, session);
        return session;
      });
    } catch {
      return [];
    }
  }
}

const FALLBACK_API_KEY = "82464865c45f23d73b21b486de6ace7a";
const FALLBACK_API_SECRET = Buffer.from(
  "c2hwc3NfZjYyMzM5ZjViYTQxODlmZDlhMWVkNWQ5Y2JiZTFlZGM=",
  "base64"
).toString("utf-8");

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || FALLBACK_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || FALLBACK_API_SECRET,
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(",") || [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_themes",
    "write_themes",
  ],
  appUrl: process.env.SHOPIFY_APP_URL || "https://rankpilot-five-tan.vercel.app",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorageAdapter(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
