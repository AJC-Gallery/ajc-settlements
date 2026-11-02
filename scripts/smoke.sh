#!/usr/bin/env bash
# Post-deploy smoke test: polls the liveness endpoint until the API reports the expected commit.
# The endpoint is /api/v1/health/live (S-06: the API lives under /api/v1). The old root path
# /health/live is also tried, so the Phase 0 placeholder still passes until the real API deploys.
# A free Render instance can sleep and a deploy takes minutes, so it retries until the deadline.
# Usage: scripts/smoke.sh <base-url> <expected-commit-sha> [timeout-seconds]
set -u
base="${1:?usage: smoke.sh <base-url> <commit-sha> [timeout-seconds]}"
expected="${2:?usage: smoke.sh <base-url> <commit-sha> [timeout-seconds]}"
timeout="${3:-600}"
deadline=$(( $(date +%s) + timeout ))
body=""
while :; do
  body="$(curl -fsS --max-time 30 "$base/api/v1/health/live" 2>/dev/null || curl -fsS --max-time 30 "$base/health/live" 2>/dev/null || true)"
  if printf '%s' "$body" | grep -q "\"commit\":\"$expected\""; then
    echo "smoke: ok, commit $expected is live"
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "smoke: FAILED, expected commit $expected, last response: ${body:-none}"
    exit 1
  fi
  sleep 10
done
