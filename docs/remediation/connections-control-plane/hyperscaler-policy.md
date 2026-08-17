# MCP and hyperscaler policy

MCP is optional and agent-facing. It is never the primary path for facility telemetry, cloud
metrics, asset storage, databases, simulations, ITSM or operational event ingestion.

Native mechanisms are authoritative: DSX operations over NATS and MQTT 3.1.1 with AsyncAPI schemas
and OAuth2/mTLS/NKey; AWS SDK with IAM roles or workload identity, CloudWatch, EventBridge, S3,
Timestream, IoT SiteWise, IoT TwinMaker, EKS/ECS, Managed Prometheus; Azure SDK with Entra ID and
Managed Identity, Azure Monitor, Blob Storage, IoT Hub, Event Grid, Azure Digital Twins, AKS;
Google Cloud APIs with Workload Identity, Cloud Monitoring, Pub/Sub, Cloud Storage, BigQuery, GKE.

Any future MCP-mediated cloud query runs through a server-side gateway that inherits AURA RBAC and
writes audit records. Brev stays under deployments and GPU validation, not the operational catalogue.
