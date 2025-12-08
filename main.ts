import { defineApp } from "@slflows/sdk/v1";
import { blocks } from "./blocks";

export const app = defineApp({
  name: "GCP Toolkit",
  installationInstructions:
    "Blocks for Google Cloud\n\nTo install:\n1. Add your API key\n2. Configure the base URL if needed\n3. Start using the blocks in your flows",

  blocks,
  config: {
    serviceAccountKey: {
      name: "Service Account Key",
      description: "Service Account Key",
      type: "string",
      required: true,
      sensitive: true,
    },
  },
});
