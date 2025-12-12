# GCP Toolkit App

A Flows app that provides high level blocks for integrating with Google Cloud Platform services. Currently supports Google Cloud Pub/Sub.

## Features

- Secure credential management using GCP Service Account Keys
- Type-safe configuration based on GCP API specifications
- OIDC token authentication for secure push subscriptions

## Available Blocks

### Subscribe to Pub/Sub Topic

Subscribes to a Google Cloud Pub/Sub topic using a push subscription and emits messages as events when notifications are received.

**Configuration:**

- **Topic ID** (required): The Pub/Sub topic identifier (e.g., `my-topic`)
- **Subscription ID** (optional): Custom subscription identifier. If not provided, a random ID will be generated

**Output:**

- **On Message**: Emitted when a notification is received
  - `data`: The message payload (automatically decoded from base64 and parsed as JSON if valid)
  - `messageId`: Unique identifier for the message
  - `publishTime`: Time at which the message was published

**How it works:**

1. Creates an HTTP(S) push subscription to your Pub/Sub topic
2. Configures OIDC token authentication for secure message delivery
3. Validates incoming messages using OAuth2 token verification
4. Emits received notifications as events
5. Automatically deletes the subscription when the block is removed

## Quick Start

1. **Configure GCP Service Account**:
   - Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   - Create or select a service account with Pub/Sub permissions
   - Grant necessary permissions (e.g., `roles/pubsub.subscriber`, `roles/pubsub.viewer`)
   - Create and download a JSON key file
   - Paste the entire JSON contents into the **Service Account Key** field

2. **Use Specific Resource Blocks**:
   - Choose from pre-built blocks like "Subscribe to Pub/Sub Topic"
   - Each block provides typed configuration fields based on GCP API schemas
