import { AppBlock, events, http, HTTPRequest } from "@slflows/sdk/v1";
import { PubSub } from "@google-cloud/pubsub";
import { JWT, OAuth2Client } from "google-auth-library";

export const pubSubPushSubscription: AppBlock = {
  name: "Subscribe to Pub/Sub Topic",
  description:
    "A block that will create a push subscription to a Google Pub/Sub Topic",

  config: {
    topicId: {
      name: "Topic ID",
      description: "Topic ID",
      type: "string",
      required: true,
      fixed: true,
    },
    subscriptionId: {
      name: "Subscription ID",
      description:
        "You can set a subscription ID or leave empty to generate a random ID",
      type: "string",
      required: false,
      fixed: true,
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
            type: "any",
            description: "Message payload. Will be decoded if valid json.",
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

      if (
        !(await isValidRequest(
          input.request,
          input.app.config,
          input.block.http?.url,
        ))
      ) {
        return await http.respond(input.request.requestId, {
          statusCode: 401,
        });
      }

      let decodedData: string;
      try {
        decodedData = Buffer.from(message.data, "base64").toString("utf-8");
      } catch (err: any) {
        return await http.respond(input.request.requestId, {
          statusCode: 400,
        });
      }

      await events.emit({
        data: tryParse(decodedData),
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

    let authClient: JWT;
    try {
      authClient = createAuthClient(serviceAccountKey);
    } catch (err: any) {
      return {
        newStatus: "failed",
        customStatusDescription: err.message,
      };
    }

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
        oidcToken: {
          serviceAccountEmail: authClient.email,
          audience: input.block.http?.url,
        },
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

    let authClient: JWT;
    try {
      authClient = createAuthClient(serviceAccountKey);
    } catch (err: any) {
      return {
        newStatus: "failed",
        customStatusDescription: err.message,
      };
    }

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

async function isValidRequest(
  req: HTTPRequest,
  config: Record<string, any>,
  endpointUrl: string | undefined,
): Promise<boolean | undefined> {
  const { serviceAccountKey } = config;

  const bearer = req.headers.Authorization;
  const [, token] = bearer.match(/Bearer (.*)/) ?? ["", ""];
  if (!token) {
    return false;
  }

  const ticket = await new OAuth2Client().verifyIdToken({
    idToken: token,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    return false;
  }

  let authClient: JWT;
  try {
    authClient = createAuthClient(serviceAccountKey);
  } catch (err: any) {
    return false;
  }

  return (
    payload?.email === authClient.email &&
    payload?.aud === endpointUrl &&
    payload?.email_verified
  );
}

function createAuthClient(input: string): JWT {
  let credentials: any;
  try {
    credentials = JSON.parse(input);
  } catch {
    throw new Error("Invalid Service Credentials Key");
  }

  if (
    typeof credentials?.client_email !== "string" ||
    typeof credentials?.private_key !== "string" ||
    typeof credentials?.project_id !== "string"
  ) {
    throw new Error("Invalid Service Credentials Key");
  }

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    projectId: credentials.project_id,
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/pubsub",
    ],
  });
}

const tryParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
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
