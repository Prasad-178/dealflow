import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

export const MCP_SERVER_CONFIG = {
  command: "tsx",
  args: ["lib/mcp/server.ts"],
  env: {} as Record<string, string>,
};

let clientInstance: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null;

/**
 * Get or create a singleton MCP client connected via stdio transport.
 */
export async function getMCPClient() {
  if (clientInstance) return clientInstance;

  clientInstance = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: MCP_SERVER_CONFIG.command,
      args: MCP_SERVER_CONFIG.args,
      env: MCP_SERVER_CONFIG.env,
    }),
  });

  return clientInstance;
}

/**
 * Get MCP tools for use in generateText calls.
 */
export async function getMCPTools() {
  const client = await getMCPClient();
  return client.tools();
}

/**
 * Close the MCP client connection.
 */
export async function closeMCPClient() {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
  }
}
