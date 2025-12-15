# GCP Toolkit

## Description

App that provides high level blocks for integrating with Google Cloud Platform services. Currently supports Pub/Sub subscriptions.

## Configuration

The app supports two authentication methods:

- `projectId` - GCP project ID (required)
- `serviceAccountEmail` - Service account email address (required)
- `serviceAccountKey` - JSON service account key for long-lived credentials (optional)
- `accessToken` - Short-lived access token from Workload Identity Federation (optional)

You must provide either `serviceAccountKey` or `accessToken`, not both.

## Blocks

- `pubSubPushSubscription`
  - Description: Creates a push subscription to a Pub/Sub topic and emits messages when they arrive. Uses OIDC authentication to verify incoming requests. Automatically cleans up the subscription when removed.
