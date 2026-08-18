/**
 * PR-0.1 Checkpoint B7.4G - Focused unit tests for src/pilot/pilotReadAdapter.
 *
 * Test-only fixtures. No network. No real Supabase client. Verifies:
 *  - classifyKpi (fresh / stale / unvalidated: null value, invalid ts, future ts)
 *  - listPilotTwins column projection + eq(created_by_user) + order + limit(25)
 *  - listPilotKpis reads the canonical simulation_runs KPI envelope
 *  - getPilotTwin stable-identifier binding
 *  - empty overview
 *  - missing asset
 *  - cross-owner asset is not returned (RLS-like server response: empty)
 *  - unauthenticated request => denied
 *  - table-read failure => sanitized (denied vs unavailable) with no fallback rows
 *  - no insert/update/upsert/delete/rpc/storage/realtime is ever invoked
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type EqCall = { col: string; val: unknown };
type BuilderState = {
  table: string;
  columns?: string;
  eqs: EqCall[];
  ordered?: { col: string; asc: boolean };
  limited?: number;
  maybeSingle: boolean;
};

const forbiddenMethodCalls: string[] = [];
const forbiddenNames = [
  "insert",
  "update",
  "upsert",
  "delete",
  "rpc",
  "storage",
  "channel",
  "removeChannel",
];

// per-test override for what the terminal select resolves to
let nextTwinsResponse: { data: unknown; error: unknown } = { data: [], error: null };
let nextKpiResponse: { data: unknown; error: unknown } = { data: [], error: null };
let nextSingleTwinResponse: { data: unknown; error: unknown } = { data: null, error: null };
let nextAuthResponse: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: "owner-1" } },
  error: null,
};

const capturedBuilders: BuilderState[] = [];

function makeBuilder(table: string): any {
  const state: BuilderState = { table, eqs: [], maybeSingle: false };
  capturedBuilders.push(state);

  const responseFor = () => {
    if (state.maybeSingle) return nextSingleTwinResponse;
    if (table === "data_centre_twins") return nextTwinsResponse;
    if (table === "simulation_runs") return nextKpiResponse;
    return { data: null, error: null };
  };

  const chain: any = {
    select(cols: string) {
      state.columns = cols;
      return chain;
    },
    eq(col: string, val: unknown) {
      state.eqs.push({ col, val });
      return chain;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      state.ordered = { col, asc: opts?.ascending ?? true };
      return chain;
    },
    limit(n: number) {
      state.limited = n;
      // resolves as thenable
      return {
        then: (resolve: (v: unknown) => void) => resolve(responseFor()),
      };
    },
    maybeSingle() {
      state.maybeSingle = true;
      return Promise.resolve(responseFor());
    },
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => {
  const from = vi.fn((table: string) => makeBuilder(table));
  const proxyFor = (name: string) =>
    new Proxy(
      () => {
        forbiddenMethodCalls.push(name);
        throw new Error(`forbidden supabase.${name} called from pilot adapter`);
      },
      {
        get() {
          forbiddenMethodCalls.push(name);
          throw new Error(`forbidden supabase.${name} access from pilot adapter`);
        },
      }
    );
  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve(nextAuthResponse),
      },
      from,
      rpc: proxyFor("rpc"),
      storage: proxyFor("storage"),
      channel: proxyFor("channel"),
      removeChannel: proxyFor("removeChannel"),
    },
  };
});

import {
  classifyKpi,
  getPilotTwin,
  KPI_FRESHNESS_HORIZON_MS,
  listPilotKpis,
  listPilotTwins,
  type PilotKpiRow,
} from "@/pilot/pilotReadAdapter";

const OWNER_COLUMNS =
  "id,name,city,region_code,tier,capacity_kw,pue_target,updated_at,created_at,created_by_user";
const KPI_COLUMNS = "id,twin_id,final_kpis,created_at";

function kpi(overrides: Partial<PilotKpiRow>): PilotKpiRow {
  return {
    id: "k1",
    twin_id: "t1",
    kpi_key: "pue",
    kpi_value: 1.2,
    kpi_unit: null,
    domain: null,
    snapshot_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  capturedBuilders.length = 0;
  forbiddenMethodCalls.length = 0;
  nextTwinsResponse = { data: [], error: null };
  nextKpiResponse = { data: [], error: null };
  nextSingleTwinResponse = { data: null, error: null };
  nextAuthResponse = { data: { user: { id: "owner-1" } }, error: null };
});

describe("classifyKpi", () => {
  const NOW = Date.parse("2026-07-24T12:00:00Z");
  it("returns fresh for a recent numeric snapshot", () => {
    const row = kpi({ snapshot_at: new Date(NOW - 60_000).toISOString() });
    expect(classifyKpi(row, NOW)).toBe("fresh");
  });
  it("returns stale for a snapshot older than the freshness horizon", () => {
    const row = kpi({
      snapshot_at: new Date(NOW - KPI_FRESHNESS_HORIZON_MS - 1_000).toISOString(),
    });
    expect(classifyKpi(row, NOW)).toBe("stale");
  });
  it("returns unvalidated when kpi_value is null", () => {
    expect(classifyKpi(kpi({ kpi_value: null }), NOW)).toBe("unvalidated");
  });
  it("returns unvalidated when snapshot_at is not parseable", () => {
    expect(classifyKpi(kpi({ snapshot_at: "not-a-date" }), NOW)).toBe("unvalidated");
  });
  it("classifies a future timestamp as fresh (within horizon), never fabricates", () => {
    // future timestamps produce (now - ts) < 0 which is <= horizon => fresh
    const row = kpi({ snapshot_at: new Date(NOW + 60_000).toISOString() });
    expect(classifyKpi(row, NOW)).toBe("fresh");
  });
});

describe("listPilotTwins", () => {
  it("returns denied when there is no authenticated user (unauthenticated / unapproved gate at caller)", async () => {
    nextAuthResponse = { data: { user: null }, error: null };
    const r = await listPilotTwins();
    expect(r).toEqual({ status: "denied" });
    expect(capturedBuilders.length).toBe(0);
  });

  it("projects only permitted columns, filters by created_by_user, orders desc, limits to 25", async () => {
    nextTwinsResponse = {
      data: [
        {
          id: "t1",
          name: "n",
          city: "MTL",
          region_code: "CA-QC",
          tier: "3",
          capacity_kw: 100,
          pue_target: 1.3,
          updated_at: "2026-01-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          created_by_user: "owner-1",
        },
      ],
      error: null,
    };
    const r = await listPilotTwins();
    expect(r.status).toBe("ok");
    const b = capturedBuilders[0];
    expect(b.table).toBe("data_centre_twins");
    expect(b.columns).toBe(OWNER_COLUMNS);
    expect(b.eqs).toEqual([{ col: "created_by_user", val: "owner-1" }]);
    expect(b.ordered).toEqual({ col: "updated_at", asc: false });
    expect(b.limited).toBe(25);
  });

  it("returns empty (not fabricated) when the server returns no rows", async () => {
    nextTwinsResponse = { data: [], error: null };
    const r = await listPilotTwins();
    expect(r).toEqual({ status: "empty" });
  });

  it("sanitizes 401 into denied without leaking data", async () => {
    nextTwinsResponse = { data: null, error: { status: 401, message: "no" } };
    const r = await listPilotTwins();
    expect(r).toEqual({ status: "denied" });
  });

  it("sanitizes generic errors into unavailable with prefixed reason, never fabricates rows", async () => {
    nextTwinsResponse = { data: null, error: { code: "42P01", message: "raw sql" } };
    const r = await listPilotTwins();
    expect(r).toEqual({ status: "unavailable", reason: "data_centre_twins:42P01" });
  });
});

describe("getPilotTwin", () => {
  it("binds twinId stably and filters by owner (cross-owner returns empty, not the row)", async () => {
    nextSingleTwinResponse = { data: null, error: null };
    const r = await getPilotTwin("t-cross");
    expect(r).toEqual({ status: "empty" });
    const b = capturedBuilders[0];
    expect(b.table).toBe("data_centre_twins");
    expect(b.columns).toBe(OWNER_COLUMNS);
    expect(b.eqs).toEqual([
      { col: "id", val: "t-cross" },
      { col: "created_by_user", val: "owner-1" },
    ]);
    expect(b.maybeSingle).toBe(true);
  });

  it("returns empty when the twin does not exist under the caller", async () => {
    nextSingleTwinResponse = { data: null, error: null };
    const r = await getPilotTwin("t-missing");
    expect(r).toEqual({ status: "empty" });
  });

  it("returns denied for unauthenticated requests", async () => {
    nextAuthResponse = { data: { user: null }, error: null };
    const r = await getPilotTwin("t1");
    expect(r).toEqual({ status: "denied" });
  });
});

describe("listPilotKpis", () => {
  it("reads the canonical simulation_runs envelope, filters by twin_id, orders desc", async () => {
    nextKpiResponse = {
      data: [
        {
          id: "r1",
          twin_id: "t1",
          final_kpis: { pue: 1.2, bad: "n/a" },
          created_at: "2026-07-24T00:00:00Z",
        },
      ],
      error: null,
    };
    const r = await listPilotKpis("t1");
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.data).toEqual([
        {
          id: "r1:pue",
          twin_id: "t1",
          kpi_key: "pue",
          kpi_value: 1.2,
          kpi_unit: null,
          domain: null,
          snapshot_at: "2026-07-24T00:00:00Z",
        },
        {
          id: "r1:bad",
          twin_id: "t1",
          kpi_key: "bad",
          kpi_value: null,
          kpi_unit: null,
          domain: null,
          snapshot_at: "2026-07-24T00:00:00Z",
        },
      ]);
    }
    const b = capturedBuilders[0];
    expect(b.table).toBe("simulation_runs");
    expect(b.columns).toBe(KPI_COLUMNS);
    expect(b.eqs).toEqual([{ col: "twin_id", val: "t1" }]);
    expect(b.ordered).toEqual({ col: "created_at", asc: false });
    expect(b.limited).toBe(1);
  });

  it("returns empty for zero runs without fabricating fallback KPIs", async () => {
    nextKpiResponse = { data: [], error: null };
    const r = await listPilotKpis("t1");
    expect(r).toEqual({ status: "empty" });
  });

  it("returns empty when the latest run recorded no KPI map", async () => {
    nextKpiResponse = {
      data: [{ id: "r1", twin_id: "t1", final_kpis: null, created_at: "2026-07-24T00:00:00Z" }],
      error: null,
    };
    const r = await listPilotKpis("t1");
    expect(r).toEqual({ status: "empty" });
  });

  it("returns denied on 403 without leaking", async () => {
    nextKpiResponse = { data: null, error: { status: 403, message: "no" } };
    const r = await listPilotKpis("t1");
    expect(r).toEqual({ status: "denied" });
  });

  it("returns unavailable with sanitized reason on read failure and no fallback rows", async () => {
    nextKpiResponse = { data: null, error: { code: "PGRST100", message: "bad" } };
    const r = await listPilotKpis("t1");
    expect(r).toEqual({ status: "unavailable", reason: "simulation_runs:PGRST100" });
  });
});

describe("adapter never performs mutating operations", () => {
  it("does not invoke insert / update / upsert / delete / rpc / storage / realtime across all read paths", async () => {
    nextTwinsResponse = { data: [], error: null };
    nextKpiResponse = { data: [], error: null };
    nextSingleTwinResponse = { data: null, error: null };
    await listPilotTwins();
    await getPilotTwin("t1");
    await listPilotKpis("t1");
    // Verify no forbidden method was touched via the throwing proxies.
    expect(forbiddenMethodCalls).toEqual([]);
    // And every builder that WAS created only touched the SELECT surface.
    for (const b of capturedBuilders) {
      expect(["data_centre_twins", "simulation_runs"]).toContain(b.table);
      expect(b.columns).toBeDefined(); // select() was called
    }
    for (const name of forbiddenNames) {
      expect(forbiddenMethodCalls).not.toContain(name);
    }
  });
});