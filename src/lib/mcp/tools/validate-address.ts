import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "validate_zoka_address",
  title: "Validate a Zoka address format",
  description:
    "Lightweight, non-cryptographic sanity check on a Zoka address string: verifies the expected 'zoka1' prefix and length bounds. This does NOT verify the address on-chain and is not a substitute for the official validator.",
  inputSchema: {
    address: z.string().min(1).describe("The Zoka address to check."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ address }) => {
    const trimmed = address.trim();
    const hasPrefix = trimmed.startsWith("zoka1");
    const inLengthRange = trimmed.length >= 20 && trimmed.length <= 128;
    const looksValid = hasPrefix && inLengthRange;
    return {
      content: [
        {
          type: "text",
          text: looksValid
            ? "Format looks valid (prefix + length OK). Not verified on-chain."
            : "Format looks invalid: expected 'zoka1' prefix and length between 20 and 128 characters.",
        },
      ],
      structuredContent: { address: trimmed, hasPrefix, inLengthRange, looksValid },
    };
  },
});
