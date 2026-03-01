// MCP client connector for the DealFlow AI platform
// Connects to the MCP server to access company data tools and resources

export const MCP_SERVER_CONFIG = {
  command: "tsx",
  args: ["lib/mcp/server.ts"],
  env: {} as Record<string, string>,
};

// In production, use @ai-sdk/mcp to connect:
// import { experimental_createMCPClient } from '@ai-sdk/mcp';
//
// const mcpClient = await experimental_createMCPClient({
//   transport: {
//     type: 'stdio',
//     command: MCP_SERVER_CONFIG.command,
//     args: MCP_SERVER_CONFIG.args,
//   },
// });
//
// const tools = await mcpClient.tools();
// Use these tools in your generateText calls
