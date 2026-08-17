#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${YUKH_NATS_QUALIFICATION_IMAGE:-nats:2.12.0-alpine@sha256:5ef5cab0ec8057c0b2017e0579f1de7ff01c9ef6d506b07cfef1e63037854776}"
CONTAINER="yukh-projects-jetstream-qualification-$$"
DOCKER=(docker)

if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    DOCKER=(sudo -n docker)
  else
    echo "jetstream-qualification: Docker daemon unavailable" >&2
    exit 1
  fi
fi

cleanup() {
  "${DOCKER[@]}" rm --force "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

"${DOCKER[@]}" run --detach --rm \
  --name "$CONTAINER" \
  --publish 127.0.0.1::4222 \
  "$IMAGE" -js -sd /data >/dev/null

MAPPING="$("${DOCKER[@]}" port "$CONTAINER" 4222/tcp)"
PORT="${MAPPING##*:}"
if [[ ! "$PORT" =~ ^[0-9]+$ ]]; then
  echo "jetstream-qualification: invalid local port" >&2
  exit 1
fi

for _ in {1..40}; do
  if node -e '
    const net = require("node:net");
    const socket = net.connect(Number(process.argv[1]), "127.0.0.1");
    socket.setTimeout(250);
    socket.once("connect", () => { socket.destroy(); process.exit(0); });
    socket.once("timeout", () => { socket.destroy(); process.exit(1); });
    socket.once("error", () => process.exit(1));
  ' "$PORT"; then
    break
  fi
  sleep 0.1
done

cd "$ROOT"
npm run build >/dev/null
YUKH_RUN_JETSTREAM_QUALIFICATION=1 \
YUKH_NATS_URL="nats://127.0.0.1:$PORT" \
node --test dist/test/work-governance-jetstream.integration.test.js

echo "work-governance-jetstream-local: PASS image=$IMAGE"
