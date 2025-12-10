/**
 * Block Registry for {{APP_NAME}}
 *
 * This file exports all blocks as a dictionary for easy registration.
 *
 * Usage in main.ts:
 *   import { blocks } from "./blocks/index.ts";
 *   export const app: App = {
 *     blocks: Object.values(blocks)
 *   };
 *
 * Adding new blocks:
 * 1. Create your block file (e.g., myBlock.ts)
 * 2. Import and add it to the blocks dictionary below
 * 3. Export it for type safety and external use
 */

import { pubSubPushSubscription } from "./pubSubPushSubscription.ts";

/**
 * Dictionary of all available blocks
 * Key: block identifier (for programmatic access)
 * Value: block definition
 */
export const blocks = {
  pubSubPushSubscription: pubSubPushSubscription,
} as const;

// Named exports for individual blocks (optional, for external imports)
export { pubSubPushSubscription };
