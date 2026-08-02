#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

failed=0
excluded=':(exclude)scripts/check-neutrality.sh'

report_matches() {
  local label="$1"
  local pattern="$2"

  if git grep -nI -E "$pattern" -- . "$excluded"; then
    printf '\nERROR: %s\n' "$label" >&2
    failed=1
  fi
}

report_matches \
  "possible credential or private key material detected" \
  '(github_pat_|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----)'

report_matches \
  "private or local hostname detected" \
  '([A-Za-z0-9-]+\.)+(internal|local|corp|lan)([^A-Za-z0-9-]|$)'

report_matches \
  "GitHub Project node identifier detected" \
  'PVT_[A-Za-z0-9_]+'

github_urls="$(git grep -IhoE 'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+' -- . "$excluded" || true)"

while IFS= read -r url; do
  [[ -z "$url" ]] && continue
  slug="${url#https://github.com/}"

  if ! grep -Fqx "$slug" config/public-reference-allowlist.txt; then
    printf 'ERROR: non-allowlisted GitHub repository URL: %s\n' "$url" >&2
    failed=1
  fi
done <<< "$github_urls"

if (( failed != 0 )); then
  printf '\nConsumer-neutrality policy checks failed.\n' >&2
  exit 1
fi

printf 'Consumer-neutrality policy checks passed.\n'
