# MCP status

Agent tools: NOT IMPLEMENTED. Existing MCP-labelled components are generic HTTP and catalogue
scaffolding. No protocol handshake, no runtime tool discovery, no registered production server and
no tool invocation have been proven. No marketplace and no connect action are rendered.

A genuine implementation requires the official MCP SDK, JSON-RPC 2.0, `initialize` with
protocol-version negotiation, Streamable HTTP for remote servers, `tools/list`, `tools/call`,
`resources/list`, `resources/read`, OAuth or cloud identity, tool allowlists, read-only default,
human approval for writes, complete audit logging, timeouts, rate limits and tenant isolation.

DSX Exchange now ships an Agentgateway bridge for MCP discovery and routing; AURA makes no claim to
use it until it is deployed and validated.
