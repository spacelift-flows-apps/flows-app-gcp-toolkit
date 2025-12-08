import { AppBlock, events, http } from "@slflows/sdk/v1";
import { PubSub } from "@google-cloud/pubsub";
import { JWT } from "google-auth-library";

export const pubSub: AppBlock = {
  name: "GCP Pub/Sub",
  description:
    "A block that will create a push subscription to a Google Pub/Sub Topic",

  config: {
    topicId: {
      name: "Topic ID",
      description: "Topic ID",
      type: "string",
      required: true,
    },
    subscriptionId: {
      name: "Subscription ID",
      description:
        "You can set a subscription ID or leave empty to generate a random ID",
      type: "string",
      required: false,
    },
  },
  outputs: {
    default: {
      name: "On Message",
      description: "Emitted Pub/Sub message payload",
      type: {
        type: "object",
        properties: {
          data: {
            type: "string",
            description: "Message text.",
          },
          messageId: {
            type: "string",
            description: "Unique message identifier.",
          },
          publishTime: {
            type: "string",
            description: "Time at which the message was published.",
          },
        },
        required: ["data", "messageId", "publishTime"],
      },
    },
  },
  signals: {
    subscriptionName: {
      name: "Subscription Name",
      description: "The name of the subscription.",
    },
    topicName: {
      name: "Topic Name",
      description: "The name of the topic.",
    },
  },
  http: {
    async onRequest(input) {
      const { message } = input.request.body;

      let data = "";
      try {
        data = Buffer.from(message.data, "base64").toString("utf-8");
      } catch (err: any) {
        console.warn(`Unable to base64 decode message data`);
        data = message.data;
      }

      await events.emit({
        data: data,
        messageId: message.messageId,
        publishTime: message.publishTime,
      });

      await http.respond(input.request.requestId, {
        statusCode: 200,
      });
    },
  },
  async onSync(input) {
    const { serviceAccountKey } = input.app.config;
    const { topicId } = input.block.config;
    let { subscriptionId } = input.block.config;

    const existingSubscription =
      input.block.lifecycle?.signals?.subscriptionName;
    if (existingSubscription) {
      return {
        newStatus: "ready",
      };
    }

    if (!subscriptionId) {
      subscriptionId = makeId(10);
    }

    const credentials = JSON.parse(serviceAccountKey);

    const authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      projectId: credentials.project_id,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/pubsub",
      ],
    });

    const pubSub = new PubSub({
      authClient: authClient,
    });

    const topic = pubSub.topic(topicId);
    const [topicExists] = await topic.exists();
    if (!topicExists) {
      return {
        newStatus: "failed",
        customStatusDescription: "Topic doesn't exist.",
      };
    }

    const subscription = topic.subscription(subscriptionId);
    const [subscriptionExists] = await subscription.exists();
    if (subscriptionExists) {
      return {
        newStatus: "ready",
      };
    }

    let subscriptionName = "";
    try {
      const [sub] = await topic.createSubscription(subscriptionId, {
        pushEndpoint: input.block.http?.url,
      });
      subscriptionName = sub.name;
    } catch (err: any) {
      console.error(err.message);

      return {
        newStatus: "failed",
        customStatusDescription: "Unable to create subscription",
      };
    }

    return {
      newStatus: "ready",
      signalUpdates: {
        topicName: topic.name,
        subscriptionName: subscriptionName,
      },
    };
  },
  async onDrain(input) {
    const { serviceAccountKey } = input.app.config;
    const topicName = input.block.lifecycle?.signals?.topicName;
    const subscriptionName = input.block.lifecycle?.signals?.subscriptionName;

    const credentials = JSON.parse(serviceAccountKey);

    const authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      projectId: credentials.project_id,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/pubsub",
      ],
    });

    const pubSub = new PubSub({
      authClient: authClient,
    });

    if (topicName && subscriptionName) {
      try {
        const subscription = pubSub
          .topic(topicName)
          .subscription(subscriptionName);
        const exists = await subscription.exists();
        if (exists) {
          await subscription.delete();
        }
      } catch (err: any) {
        return {
          newStatus: "draining_failed",
          customStatusDescription: err.message,
        };
      }
    }

    return {
      newStatus: "drained",
    };
  },
};

function makeId(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
