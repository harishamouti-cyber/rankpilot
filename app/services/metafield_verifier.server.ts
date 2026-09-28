export interface VerifiedMetafieldDefinition {
  name: string;
  namespace: string;
  key: string;
  type: string;
  owner: string;
  description: string;
  isRegistered: boolean;
  status: "REGISTERED" | "UNREGISTERED";
  pinned: boolean;
  id?: string;
}

export const REQUIRED_METAFIELD_DEFINITIONS = [
  {
    name: "RankPilot JSON-LD Schema",
    namespace: "rankpilot",
    key: "schema_json",
    type: "json",
    owner: "Product",
    description: "Google AI & LLM JSON-LD structured product graph",
  },
  {
    name: "RankPilot Spec Matrix",
    namespace: "rankpilot",
    key: "spec_table",
    type: "multi_line_text_field",
    owner: "Product",
    description: "High-density technical comparison matrix",
  },
  {
    name: "RankPilot Conversational FAQ",
    namespace: "rankpilot",
    key: "faq_json",
    type: "json",
    owner: "Product",
    description: "Conversational FAQ entities for Perplexity citations",
  },
  {
    name: "RankPilot GEO Score",
    namespace: "rankpilot",
    key: "seo_score",
    type: "number_integer",
    owner: "Product",
    description: "0-100 Generative Engine Optimization index score",
  },
];

const GET_METAFIELD_DEFINITIONS_QUERY = `#graphql
query GetProductMetafieldDefinitions {
  metafieldDefinitions(first: 50, ownerType: PRODUCT) {
    nodes {
      id
      name
      namespace
      key
      type {
        name
      }
      description
      pinnedPosition
    }
  }
}
`;

export async function verifyProductMetafieldDefinitions(adminClient?: any): Promise<{
  definitions: VerifiedMetafieldDefinition[];
  allRegistered: boolean;
  registeredCount: number;
}> {
  let existingNodes: any[] = [];

  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const response: any = await adminClient.graphql(GET_METAFIELD_DEFINITIONS_QUERY);
      const json = await response.json();
      existingNodes = json?.data?.metafieldDefinitions?.nodes || [];
    } catch (err) {
      console.warn("[Metafield Verifier] GraphQL query error:", err);
    }
  }

  const definitions: VerifiedMetafieldDefinition[] = REQUIRED_METAFIELD_DEFINITIONS.map((def) => {
    // Check if matching definition exists on Shopify Product owner
    const matchedNode = existingNodes.find(
      (node) =>
        node.namespace === def.namespace &&
        (node.key === def.key || (def.key === "spec_table" && node.key === "spec_matrix"))
    );

    const isRegistered = Boolean(matchedNode);

    return {
      name: def.name,
      namespace: def.namespace,
      key: `rankpilot.${def.key}`,
      type: def.type,
      owner: def.owner,
      description: def.description,
      isRegistered,
      status: isRegistered ? "REGISTERED" : "UNREGISTERED",
      pinned: Boolean(matchedNode && matchedNode.pinnedPosition !== null),
      id: matchedNode?.id,
    };
  });

  const registeredCount = definitions.filter((d) => d.isRegistered).length;
  const allRegistered = registeredCount === REQUIRED_METAFIELD_DEFINITIONS.length;

  return {
    definitions,
    allRegistered,
    registeredCount,
  };
}

const METAFIELD_DEFINITION_CREATE_MUTATION = `#graphql
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export async function resyncMissingMetafieldDefinitions(adminClient?: any): Promise<{
  created: string[];
  alreadyRegistered: string[];
  errors: Array<{ key: string; message: string }>;
}> {
  const created: string[] = [];
  const alreadyRegistered: string[] = [];
  const errors: Array<{ key: string; message: string }> = [];

  if (!adminClient || typeof adminClient.graphql !== "function") {
    return {
      created: [],
      alreadyRegistered: REQUIRED_METAFIELD_DEFINITIONS.map((d) => `rankpilot.${d.key}`),
      errors: [],
    };
  }

  for (const def of REQUIRED_METAFIELD_DEFINITIONS) {
    try {
      const response: any = await adminClient.graphql(METAFIELD_DEFINITION_CREATE_MUTATION, {
        variables: {
          definition: {
            name: def.name,
            namespace: def.namespace,
            key: def.key,
            type: def.type,
            description: def.description,
            ownerType: "PRODUCT",
            pin: true,
          },
        },
      });
      const data = await response.json();
      const userErrors = data?.data?.metafieldDefinitionCreate?.userErrors || [];

      if (userErrors.length > 0) {
        const isTaken = userErrors.some(
          (e: any) => e.code === "TAKEN" || e.message?.toLowerCase().includes("taken")
        );
        if (isTaken) {
          alreadyRegistered.push(`rankpilot.${def.key}`);
        } else {
          errors.push({ key: `rankpilot.${def.key}`, message: userErrors[0]?.message || "Creation error" });
        }
      } else {
        created.push(`rankpilot.${def.key}`);
      }
    } catch (err: any) {
      errors.push({ key: `rankpilot.${def.key}`, message: err.message });
    }
  }

  return { created, alreadyRegistered, errors };
}
