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

class PrismaSessionStorageAdapter implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
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

    await db.session.upsert({
      where: { id: session.id },
      create: data,
      update: data,
    });

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
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
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await db.session.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    await db.session.deleteMany({ where: { id: { in: ids } } });
    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
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
      return session;
    });
  }
}

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "rankpilot_dev_key",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "rankpilot_dev_secret",
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(",") || ["write_products", "read_products"],
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
