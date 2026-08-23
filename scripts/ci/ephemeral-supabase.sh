#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${AURA_EPHEMERAL_STATE_DIR:-/tmp/aura-ephemeral-supabase}"
STATUS_ENV="$STATE_DIR/supabase.env"
FUNCTION_ENV="$STATE_DIR/functions.env"
FUNCTION_LOG="$STATE_DIR/functions.log"
FUNCTION_PID="$STATE_DIR/functions.pid"
CORS_ORIGIN="${AURA_TEST_APP_ORIGIN:-http://localhost:8080}"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

append_github_env() {
  local key="$1"
  local value="$2"
  if [[ -z "${GITHUB_ENV:-}" ]]; then
    printf '%s=%s\n' "$key" "$value"
  else
    printf '%s=%s\n' "$key" "$value" >> "$GITHUB_ENV"
  fi
}

mask_secret() {
  local value="$1"
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

require_captured_env() {
  if [[ ! -f "$STATUS_ENV" ]]; then
    echo "Ephemeral Supabase credentials are unavailable; run capture first" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$STATUS_ENV"
  set +a
  : "${API_URL:?API_URL missing from supabase status}"
  : "${ANON_KEY:?ANON_KEY missing from supabase status}"
  : "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY missing from supabase status}"
  : "${DB_URL:?DB_URL missing from supabase status}"
}

prepare() {
  node scripts/phase3/check-migration-immutability.mjs
  AURA_REPLAY_EPHEMERAL=1 node scripts/phase3/prepare-clean-replay.mjs --ephemeral
}

start_stack() {
  # Supabase CLI 2.34.x service names. Keep this list common across every
  # release-validation workflow so one lane cannot silently drift from another.
  supabase start -x studio,imgproxy,mailpit,logflare,vector,supavisor
}

capture_credentials() {
  supabase status -o env > "$STATUS_ENV"
  chmod 600 "$STATUS_ENV"
  require_captured_env

  mask_secret "$ANON_KEY"
  mask_secret "$SERVICE_ROLE_KEY"

  # Emit both generic QA names and Phase 3 validator names. They all reference
  # the same disposable loopback stack and become visible only to later steps.
  append_github_env "VITE_SUPABASE_URL" "$API_URL"
  append_github_env "VITE_SUPABASE_PUBLISHABLE_KEY" "$ANON_KEY"
  append_github_env "TEST_SUPABASE_URL" "$API_URL"
  append_github_env "TEST_SUPABASE_ANON_KEY" "$ANON_KEY"
  append_github_env "SUPABASE_URL" "$API_URL"
  append_github_env "SUPABASE_ANON_KEY" "$ANON_KEY"
  append_github_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"
  append_github_env "QA_DB_URL" "$DB_URL"
  append_github_env "AURA_VALIDATION_DB_URL" "$DB_URL"
  append_github_env "AURA_VALIDATION_API_URL" "$API_URL"
  append_github_env "AURA_VALIDATION_ANON_KEY" "$ANON_KEY"
  append_github_env "AURA_VALIDATION_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"
}

provision_user() {
  require_captured_env

  local suffix="${AURA_TEST_USER_SUFFIX:-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}}"
  # Keep the local part predictable enough for diagnostics while allowing only
  # characters valid in the generated CI suffixes we control.
  suffix="$(printf '%s' "$suffix" | tr -cs 'A-Za-z0-9._-' '-')"
  local email="qa-${suffix}@example.invalid"
  local password
  password="$(openssl rand -hex 24)Aa1!"
  mask_secret "$password"

  local user_json
  user_json="$(curl -fsS \
    -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"AURA QA Admin\"}}")"

  local user_id
  user_id="$(printf '%s' "$user_json" | jq -r '.id // empty')"
  if [[ -z "$user_id" ]]; then
    echo "Failed to provision the disposable QA user" >&2
    exit 1
  fi

  local profile_count
  profile_count="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc \
    "UPDATE public.profiles SET is_approved = true WHERE user_id = '$user_id'::uuid; SELECT count(*) FROM public.profiles WHERE user_id = '$user_id'::uuid AND is_approved = true;")"
  profile_count="$(printf '%s\n' "$profile_count" | tail -n 1)"
  [[ "$profile_count" == "1" ]]

  psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO public.user_roles (user_id, role, scope, granted_by) VALUES ('$user_id'::uuid, 'admin', 'global', '$user_id'::uuid);"

  local role_count
  role_count="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc \
    "SELECT count(*) FROM public.user_roles WHERE user_id = '$user_id'::uuid AND role = 'admin' AND scope = 'global';")"
  [[ "$role_count" == "1" ]]

  append_github_env "TEST_USER_EMAIL" "$email"
  append_github_env "TEST_USER_PASSWORD" "$password"
}

serve_functions() {
  require_captured_env

  cat > "$FUNCTION_ENV" <<EOF
CORS_ALLOWED_ORIGINS=$CORS_ORIGIN
ENVIRONMENT=test
EOF
  chmod 600 "$FUNCTION_ENV"

  nohup supabase functions serve --no-verify-jwt=false --env-file "$FUNCTION_ENV" > "$FUNCTION_LOG" 2>&1 &
  echo "$!" > "$FUNCTION_PID"

  local ready=0
  local last_status="unavailable"
  local headers clean_headers
  for i in $(seq 1 60); do
    headers="$STATE_DIR/preflight-${i}.headers"
    clean_headers="$STATE_DIR/preflight-${i}.clean.headers"
    last_status="$(curl -sS -o /dev/null -D "$headers" -w '%{http_code}' \
      "$API_URL/functions/v1/run-lifecycle" \
      -X OPTIONS \
      -H "Origin: $CORS_ORIGIN" \
      -H 'Access-Control-Request-Method: POST' \
      -H 'Access-Control-Request-Headers: authorization, apikey, content-type, x-organization-id' || true)"
    tr -d '\r' < "$headers" > "$clean_headers" 2>/dev/null || true

    if [[ "$last_status" == "204" ]] && \
       grep -Fqi "access-control-allow-origin: $CORS_ORIGIN" "$clean_headers"; then
      ready=1
      break
    fi
    sleep 2
  done

  if [[ "$ready" -ne 1 ]]; then
    echo "Local Edge Functions did not satisfy the CORS readiness contract (last HTTP status: $last_status)" >&2
    [[ -f "${clean_headers:-}" ]] && cat "$clean_headers" || true
    tail -n 200 "$FUNCTION_LOG" || true
    exit 1
  fi
}

show_function_logs() {
  tail -n 200 "$FUNCTION_LOG" 2>/dev/null || true
}

stop_stack() {
  if [[ -f "$FUNCTION_PID" ]]; then
    kill "$(cat "$FUNCTION_PID")" 2>/dev/null || true
  fi
  supabase stop --no-backup || true
}

record_versions() {
  append_github_env "AURA_VALIDATION_CLI_VERSION" "$(supabase --version)"
  append_github_env "AURA_VALIDATION_SOURCE_SHA" "${AURA_SOURCE_SHA:-${GITHUB_SHA:-unknown}}"
  psql --version || true
}

case "${1:-}" in
  prepare) prepare ;;
  start) start_stack ;;
  capture) capture_credentials ;;
  provision-user) provision_user ;;
  serve-functions) serve_functions ;;
  function-logs) show_function_logs ;;
  stop) stop_stack ;;
  record-versions) record_versions ;;
  *)
    echo "Usage: $0 {prepare|start|capture|provision-user|serve-functions|function-logs|stop|record-versions}" >&2
    exit 2
    ;;
esac
