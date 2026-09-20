import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, useNavigate } from "@remix-run/react";
import React, { useState, useEffect } from "react";
import {
  Page,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Banner,
  Divider,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { getCurrentPlan, confirmShopPlan, PLANS, PlanDefinition } from "~/services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";
  const confirmed = url.searchParams.get("confirmed");
  const planParam = url.searchParams.get("plan");
  const chargeId = url.searchParams.get("charge_id");

  if (confirmed === "true" && planParam && ["STARTER", "PRO", "SCALE"].includes(planParam)) {
    await confirmShopPlan(shop, planParam as any, chargeId || undefined);
  }

  const currentPlan = await getCurrentPlan(shop);
  return json({
    shop,
    currentPlan,
    plans: PLANS,
    justConfirmed: confirmed === "true" ? planParam : null,
  });
};

export default function BillingPage() {
  const { shop, currentPlan, plans, justConfirmed } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(
    justConfirmed ? `✓ Subscription successfully upgraded to ${justConfirmed} plan!` : null
  );

  const handleSelectPlan = async (plan: PlanDefinition) => {
    if (plan.id === currentPlan.id) return;
    setIsUpdating(plan.id);

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          planId: plan.id,
          action: "create_subscription",
          returnUrl: `${window.location.origin}/app/billing?shop=${encodeURIComponent(shop)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate subscription");

      if (data.confirmationUrl) {
        if (data.confirmationUrl.startsWith("http")) {
          window.location.href = data.confirmationUrl;
        } else {
          // Internal redirection
          navigate(data.confirmationUrl);
        }
      } else {
        setToastMessage(`✓ Successfully switched subscription to ${plan.name}!`);
        revalidator.revalidate();
      }
    } catch (err: any) {
      alert(`Billing error: ${err.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Page
      title="Plans & Subscription"
      subtitle="Select the plan that matches your catalog size and generative search requirements."
      backAction={{
        content: "Back to Dashboard",
        onAction: () => navigate("/app"),
      }}
    >
      <BlockStack gap="500">
        {toastMessage && (
          <Banner tone="success" onDismiss={() => setToastMessage(null)}>
            <Text as="p" variant="bodyMd">
              {toastMessage}
            </Text>
          </Banner>
        )}

        <Banner tone="info">
          <Text as="p" variant="bodySm">
            All subscription charges are billed securely and directly via your native Shopify 30-day billing cycle.
            Plans include zero contract lock-in, with instant upgrades and downgrades.
          </Text>
        </Banner>

        <InlineStack gap="400" align="space-between">
          {Object.values(plans).map((plan: PlanDefinition) => {
            const isCurrent = plan.id === currentPlan.id;

            return (
              <Box
                key={plan.id}
                width="31%"
                padding="500"
                background={isCurrent ? "bg-surface" : "bg-surface-secondary"}
                borderRadius="300"
                borderWidth={isCurrent ? "050" : "025"}
                borderColor={isCurrent ? "border-success" : "border"}
                shadow={isCurrent ? "200" : "100"}
              >
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd" fontWeight="bold">
                      {plan.name}
                    </Text>
                    {isCurrent && (
                      <Badge tone="success" size="small">
                        Current Plan
                      </Badge>
                    )}
                    {plan.recommended && !isCurrent && (
                      <Badge tone="attention" size="small">
                        Most Popular
                      </Badge>
                    )}
                    {plan.trialDays > 0 && !isCurrent && (
                      <Badge tone="info" size="small">
                        7-Day Free Trial
                      </Badge>
                    )}
                  </InlineStack>

                  <BlockStack gap="050">
                    <InlineStack gap="100" blockAlign="baseline">
                      <Text as="span" variant="heading2xl" fontWeight="bold">
                        ${plan.price}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        / month
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {plan.productLimit >= 10000
                        ? "Unlimited catalog products"
                        : `Up to ${plan.productLimit} products`}
                    </Text>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    {plan.features.map((feat, idx) => (
                      <InlineStack key={idx} gap="200" blockAlign="center">
                        <CheckIcon width={16} height={16} fill="#008060" />
                        <Text as="span" variant="bodySm">
                          {feat}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  <Box paddingBlockStart="300">
                    <Button
                      fullWidth
                      variant={isCurrent ? "secondary" : "primary"}
                      disabled={isCurrent}
                      loading={isUpdating === plan.id}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isCurrent
                        ? "Active Plan"
                        : plan.trialDays > 0
                        ? `Start 7-Day Free Trial (${plan.name})`
                        : `Upgrade to ${plan.name} ($${plan.price}/mo)`}
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            );
          })}
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
