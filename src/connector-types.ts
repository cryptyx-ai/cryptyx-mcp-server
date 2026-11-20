/**
 * Shape of the connector snapshot bundled with the package
 * (src/generated/connector.ts). The snapshot is generated from the remote MCP
 * connector's own source in the CRYPTYX repo, so the package lists the same
 * tools, descriptions, schemas and instructions as https://mcp.cryptyx.ai/api/mcp.
 */

export interface ConnectorToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ConnectorTool {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: 'object'; [key: string]: unknown };
  annotations: ConnectorToolAnnotations;
}

export interface ConnectorSnapshot {
  serverName: string;
  serverTitle: string;
  /** The `instructions` string sent on initialize (identical to the remote connector's). */
  instructions: string;
  tools: ConnectorTool[];
  /** Tool names that earlier versions listed. Calls to them get the remote connector's refusal. */
  retiredTools: string[];
  /** The remote connector's refusal for a retired tool, with `{tool}` as the placeholder. */
  staleHostMessageTemplate: string;
}
