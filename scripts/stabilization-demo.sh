#!/usr/bin/env bash
set -euo pipefail

# Isolated, persistent demo lifecycle for the cross-PSP QRIS investigation path.
# It deliberately uses a unique Compose project and named volumes so it cannot
# collide with another FinGraph stack on the same host.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${FINGRAPH_DEMO_PROJECT:-fingraph-stabilization}"
PORT="${FINGRAPH_DEMO_PORT:-18080}"
OUTPUT="${FINGRAPH_DEMO_OUTPUT:-${ROOT_DIR}/stabilization-demo-summary.json}"

export FINGRAPH_NETWORK_PREFIX="${FINGRAPH_NETWORK_PREFIX:-${PROJECT}}"
export POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-${PROJECT}-postgres-data}"
export NEO4J_DATA_VOLUME_NAME="${NEO4J_DATA_VOLUME_NAME:-${PROJECT}-neo4j-data}"
export NEO4J_LOGS_VOLUME_NAME="${NEO4J_LOGS_VOLUME_NAME:-${PROJECT}-neo4j-logs}"
export ML_ARTIFACT_VOLUME_NAME="${ML_ARTIFACT_VOLUME_NAME:-${PROJECT}-ml-artifacts}"
export PUBLIC_HTTP_PORT="$PORT"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-demo-postgres-password}"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-demo-neo4j-password}"
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-demo-jwt-secret-key}"
export PJP_SIMULATOR_SECRET="${PJP_SIMULATOR_SECRET:-demo-pjp-simulator-secret}"
export PAYER_PSEUDONYM_KEY="${PAYER_PSEUDONYM_KEY:-demo-payer-pseudonym-key}"
export ML_ARTIFACT_SIGNING_KEY="${ML_ARTIFACT_SIGNING_KEY:-demo-artifact-signing-key}"
export PSP_EVENT_KEYS="${PSP_EVENT_KEYS:-psp_a=demo-psp-a-key;psp_b=demo-psp-b-key;psp_c=demo-psp-c-key}"
export CENTRAL_INVESTIGATOR_EMAILS="${CENTRAL_INVESTIGATOR_EMAILS:-analyst@fingraph.id;admin@fingraph.id}"

compose() {
  docker compose --project-name "$PROJECT" --file "$ROOT_DIR/docker-compose.yml" --file "$ROOT_DIR/docker-compose.demo.yml" "$@"
}

wait_for_http() {
  local url="$1"
  for _ in $(seq 1 90); do
    if curl --fail --silent "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for $url" >&2
  compose ps
  return 1
}

command="${1:-start}"
case "$command" in
  start)
    compose up -d --build
    compose --profile demo-seed run --rm seed-demo
    compose run --rm --no-deps backend python /app/scripts/train_qris_gnn.py --epochs 2 --limit-rows 120
    wait_for_http "http://127.0.0.1:${PORT}/api/v1/health/live"
    echo "FinGraph stabilization demo is ready at http://127.0.0.1:${PORT}"
    echo "Run '$0 events' to send the six signed PSP observations."
    ;;
  events)
    python3 "$ROOT_DIR/backend/scripts/run_psp_demo.py" --base-url "http://127.0.0.1:${PORT}" --output "$OUTPUT"
    echo "Summary written to $OUTPUT"
    ;;
  restart)
    compose restart backend
    wait_for_http "http://127.0.0.1:${PORT}/api/v1/health/live"
    echo "Backend restarted; PostgreSQL data and the signed GNN volume were preserved."
    ;;
  logs)
    compose logs --tail="${FINGRAPH_DEMO_LOG_LINES:-200}" "${2:-backend}"
    ;;
  stop)
    compose down
    ;;
  *)
    echo "Usage: $0 {start|events|restart|logs|stop}" >&2
    exit 2
    ;;
esac
