import { defineApp } from "@slflows/sdk/v1";
import { blocks } from "./blocks";

export const app = defineApp({
  name: "GCP Toolkit",
  installationInstructions: `## Authentication Setup

You need to authenticate with GCP using a Service Account Key:

1. Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create or select a service account
3. Grant necessary permissions (varies by service - see GCP documentation)
4. Click **Keys** → **Add Key** → **Create New Key** → **JSON**
5. Download the JSON file
6. Paste the entire JSON contents into the **Service Account Key** field below`,
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
