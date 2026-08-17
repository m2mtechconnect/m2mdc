/**
 * MQTT runtime policy primitives.
 *
 * Pure and dependency-free so the containerised worker, the Vitest suite and
 * the browser (for display of the configured policy) all agree on the rules.
 * Nothing here opens a socket or reads a credential.
 */

export interface MqttRuntimePolicy {
  /** Topic filters the worker is permitted to subscribe to. */
  topic_allowlist: string[];
  /** Wildcard (`+` / `#`) filters are refused unless explicitly authorised. */
  allow_wildcard_subscriptions: boolean;
  /** Hard payload ceiling. Larger messages are rejected unparsed. */
  max_payload_bytes: number;
  /** Messages older than this are rejected as stale, never displayed as live. */
  max_observation_age_ms: number;
  /** Forward clock skew tolerated on observed_at. */
  max_clock_skew_ms: number;
  /** QoS the worker subscribes with. Only 0 and 1 are supported. */
  qos: 0 | 1;
  /** Maximum simultaneous broker connections a single worker may hold. */
  max_connections: number;
  /** Broker connect timeout. */
  connect_timeout_ms: number;
  /** Reconnect backoff bounds. */
  reconnect_base_ms: number;
  reconnect_max_ms: number;
  max_reconnect_attempts: number;
}

export const DEFAULT_MQTT_POLICY: MqttRuntimePolicy = {
  topic_allowlist: [],
  allow_wildcard_subscriptions: false,
  max_payload_bytes: 64 * 1024,
  max_observation_age_ms: 10 * 60_000,
  max_clock_skew_ms: 5 * 60_000,
  qos: 1,
  max_connections: 1,
  connect_timeout_ms: 8_000,
  reconnect_base_ms: 1_000,
  reconnect_max_ms: 60_000,
  max_reconnect_attempts: 20,
};

export function resolvePolicy(configuration: Record<string, unknown> | null | undefined): MqttRuntimePolicy {
  const cfg = (configuration ?? {}) as Record<string, unknown>;
  const num = (key: string, fallback: number) => {
    const v = cfg[key];
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const list = Array.isArray(cfg.topic_allowlist)
    ? (cfg.topic_allowlist as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0)
    : [];
  const qosRaw = cfg.qos;
  return {
    ...DEFAULT_MQTT_POLICY,
    topic_allowlist: list,
    allow_wildcard_subscriptions: cfg.allow_wildcard_subscriptions === true,
    max_payload_bytes: num('max_payload_bytes', DEFAULT_MQTT_POLICY.max_payload_bytes),
    max_observation_age_ms: num('max_observation_age_ms', DEFAULT_MQTT_POLICY.max_observation_age_ms),
    max_clock_skew_ms: num('max_clock_skew_ms', DEFAULT_MQTT_POLICY.max_clock_skew_ms),
    qos: qosRaw === 0 ? 0 : 1,
    max_connections: num('max_connections', DEFAULT_MQTT_POLICY.max_connections),
    connect_timeout_ms: num('connect_timeout_ms', DEFAULT_MQTT_POLICY.connect_timeout_ms),
    reconnect_base_ms: num('reconnect_base_ms', DEFAULT_MQTT_POLICY.reconnect_base_ms),
    reconnect_max_ms: num('reconnect_max_ms', DEFAULT_MQTT_POLICY.reconnect_max_ms),
    max_reconnect_attempts: num('max_reconnect_attempts', DEFAULT_MQTT_POLICY.max_reconnect_attempts),
  };
}

export function isWildcardFilter(filter: string): boolean {
  return filter.split('/').some((seg) => seg === '+' || seg === '#');
}

/** Standard MQTT 3.1.1 topic filter matching. */
export function topicMatchesFilter(topic: string, filter: string): boolean {
  const t = topic.split('/');
  const f = filter.split('/');
  for (let i = 0; i < f.length; i += 1) {
    if (f[i] === '#') return i === f.length - 1;
    if (i >= t.length) return false;
    if (f[i] === '+') continue;
    if (f[i] !== t[i]) return false;
  }
  return t.length === f.length;
}

export type SubscriptionVerdict =
  | { allowed: true; filters: string[] }
  | { allowed: false; reason: string };

/**
 * A worker may only subscribe to filters that are on the allowlist AND, for
 * tenant-scoped connections, rooted at that tenant's topic namespace.
 * Wildcards require an explicit authorisation flag.
 */
export function authoriseSubscriptions(
  policy: MqttRuntimePolicy,
  tenantId: string | null,
): SubscriptionVerdict {
  if (policy.topic_allowlist.length === 0) {
    return { allowed: false, reason: 'no topic allowlist configured' };
  }
  for (const filter of policy.topic_allowlist) {
    if (isWildcardFilter(filter) && !policy.allow_wildcard_subscriptions) {
      return { allowed: false, reason: `wildcard filter "${filter}" requires explicit authorisation` };
    }
    if (filter === '#' || filter === '+/#') {
      return { allowed: false, reason: 'subscribing to the whole broker namespace is never permitted' };
    }
    if (tenantId && !filter.startsWith(tenantTopicRoot(tenantId))) {
      return {
        allowed: false,
        reason: `filter "${filter}" is outside this tenant's topic namespace`,
      };
    }
  }
  return { allowed: true, filters: [...policy.topic_allowlist] };
}

/** Tenant-scoped topic namespace. Cross-tenant topics can never match. */
export function tenantTopicRoot(tenantId: string): string {
  return `aura/${tenantId}/`;
}

export function topicAllowed(topic: string, policy: MqttRuntimePolicy, tenantId: string | null): boolean {
  if (tenantId && !topic.startsWith(tenantTopicRoot(tenantId))) return false;
  return policy.topic_allowlist.some((f) => topicMatchesFilter(topic, f));
}

/** Full-jitter exponential backoff, capped. Deterministic when rand is given. */
export function reconnectDelayMs(attempt: number, policy: MqttRuntimePolicy, rand = Math.random): number {
  const exp = Math.min(policy.reconnect_max_ms, policy.reconnect_base_ms * 2 ** Math.max(0, attempt - 1));
  return Math.round(exp / 2 + rand() * (exp / 2));
}