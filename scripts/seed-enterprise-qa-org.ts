import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

type Persona = { key: string; role: string; required: boolean };
type Facility = {
  id: string; name: string; city: string; region_code: string; tier: string;
  capacity_kw: number; pue_target: number; carbon_intensity: number;
  renewable_target_pct: number; sovereignty_level: string; industry: string;
  metadata: Record<string, unknown>;
};
type Fixture = {
  schemaVersion: number;
  fixtureId: string;
  classification: 'SIMULATED_TEST_DATA';
  provenance: Record<string, unknown>;
  organization: Record<string, unknown> & { id: string; name: string };
  personas: Persona[];
  facilities: Facility[];
};

const url = process.env.VITE_SUPABASE_URL?.trim() || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const allow = process.env.AURA_ALLOW_QA_SEED === '1';
const allowManaged = process.env.AURA_ALLOW_MANAGED_QA_SEED === '1';
const personaUsers = JSON.parse(process.env.AURA_QA_PERSONA_USERS_JSON || '{}') as Record<string, string>;

if (!allow) throw new Error('Refusing to seed: set AURA_ALLOW_QA_SEED=1.');
if (!url || !serviceKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
if (/supabase\.(co|io)$/i.test(new URL(url).hostname) && !allowManaged) {
  throw new Error('Refusing to seed a managed Supabase project without AURA_ALLOW_MANAGED_QA_SEED=1.');
}

const fixtureUrl = new URL('../tests/fixtures/enterprise-qa-organization.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8')) as Fixture;
if (fixture.classification !== 'SIMULATED_TEST_DATA') throw new Error('Fixture must be explicitly simulated.');
if (fixture.provenance.live !== false) throw new Error('Fixture provenance must never claim live data.');

const ownerId = personaUsers.owner;
if (!ownerId) throw new Error('AURA_QA_PERSONA_USERS_JSON must include an existing auth user UUID for "owner".');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
for (const [persona, userId] of Object.entries(personaUsers)) {
  if (!uuid.test(userId)) throw new Error(`Invalid UUID for persona ${persona}.`);
}
for (const required of fixture.personas.filter((persona) => persona.required)) {
  if (!personaUsers[required.key]) throw new Error(`Missing required persona mapping: ${required.key}.`);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function assertAuthUsersExist() {
  for (const [persona, userId] of Object.entries(personaUsers)) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) throw new Error(`Persona ${persona} does not map to an existing auth user.`);
  }
}

async function seed() {
  console.log(`Seeding ${fixture.fixtureId} as ${fixture.classification}...`);
  await assertAuthUsersExist();

  const { error: orgError } = await supabase
    .from('organizations')
    .upsert(fixture.organization, { onConflict: 'id' });
  if (orgError) throw orgError;

  const memberships = fixture.personas.flatMap((persona) => {
    const userId = personaUsers[persona.key];
    return userId ? [{
      org_id: fixture.organization.id,
      user_id: userId,
      role: persona.role,
      status: 'active',
      is_default: persona.key === 'owner',
      granted_by: ownerId,
    }] : [];
  });
  const { error: membershipError } = await supabase
    .from('org_memberships')
    .upsert(memberships, { onConflict: 'org_id,user_id' });
  if (membershipError) throw membershipError;

  const twins = fixture.facilities.map((facility) => ({
    ...facility,
    org_id: fixture.organization.id,
    created_by_user: ownerId,
    metadata: {
      ...facility.metadata,
      fixture_id: fixture.fixtureId,
      data_classification: fixture.classification,
      provenance: fixture.provenance,
    },
  }));
  const { error: twinError } = await supabase
    .from('data_centre_twins')
    .upsert(twins, { onConflict: 'id' });
  if (twinError) throw twinError;

  const [{ data: org }, { data: verifiedMemberships }, { data: verifiedTwins }] = await Promise.all([
    supabase.from('organizations').select('id,name,domain').eq('id', fixture.organization.id).single(),
    supabase.from('org_memberships').select('user_id,role,status,is_default').eq('org_id', fixture.organization.id),
    supabase.from('data_centre_twins').select('id,name,org_id,metadata').eq('org_id', fixture.organization.id),
  ]);
  if (!org || verifiedMemberships?.length !== memberships.length || verifiedTwins?.length !== twins.length) {
    throw new Error('QA seed verification failed; expected rows were not read back.');
  }

  console.log(JSON.stringify({
    fixtureId: fixture.fixtureId,
    organizationId: fixture.organization.id,
    memberships: verifiedMemberships.length,
    facilities: verifiedTwins.length,
    classification: fixture.classification,
  }, null, 2));
}

seed().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
