#!/usr/bin/env bash
set -euo pipefail

api_version=2026-03-10
rest_reserve=${YKP_REST_RESERVE:-250}
cache_ttl=${YKP_REST_CACHE_TTL:-5m}

die() { printf 'github-rest-first: %s\n' "$1" >&2; exit 2; }
is_uint() { [[ ${1:-} =~ ^[1-9][0-9]*$ ]]; }
is_owner() { [[ ${1:-} =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,38}$ ]]; }
is_repo() { [[ ${1:-} =~ ^[A-Za-z0-9_.-]{1,100}$ ]]; }
is_sha() { [[ ${1:-} =~ ^[0-9a-fA-F]{40}$ ]]; }
is_fields() { [[ ${1:-} =~ ^[1-9][0-9]*(,[1-9][0-9]*)*$ ]]; }
need() { command -v "$1" >/dev/null 2>&1 || die "required command unavailable: $1"; }

need gh
need jq
[[ $rest_reserve =~ ^[0-9]+$ ]] || die 'YKP_REST_RESERVE must be a non-negative integer'
[[ $cache_ttl =~ ^[0-9]+[smhd]$ ]] || die 'YKP_REST_CACHE_TTL must be a duration such as 5m'

rate_json=$(gh api rate_limit)
if [[ ${1:-} == rate ]]; then
  jq '{rest:.resources.core,graphql:.resources.graphql,search:.resources.search}' <<<"$rate_json"
  exit 0
fi

remaining=$(jq -er '.resources.core.remaining' <<<"$rate_json")
(( remaining > rest_reserve )) || die "REST reserve reached; remaining=$remaining reserve=$rest_reserve"

get() {
  gh api --cache "$cache_ttl" -H "X-GitHub-Api-Version: $api_version" "$1"
}

list() {
  gh api --cache "$cache_ttl" --paginate --slurp -H "X-GitHub-Api-Version: $api_version" "$1"
}

command_name=${1:-}
shift || true
case "$command_name" in
  project)
    [[ $# == 2 ]] || die 'usage: project OWNER PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid project selector'
    get "orgs/$1/projectsV2/$2"
    ;;
  user-project)
    [[ $# == 2 ]] || die 'usage: user-project USERNAME PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid user project selector'
    get "users/$1/projectsV2/$2"
    ;;
  fields)
    [[ $# == 2 ]] || die 'usage: fields OWNER PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid project selector'
    list "orgs/$1/projectsV2/$2/fields?per_page=100"
    ;;
  user-fields)
    [[ $# == 2 ]] || die 'usage: user-fields USERNAME PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid user project selector'
    list "users/$1/projectsV2/$2/fields?per_page=100"
    ;;
  items)
    [[ $# == 2 ]] || die 'usage: items OWNER PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid project selector'
    list "orgs/$1/projectsV2/$2/items?per_page=100"
    ;;
  user-items)
    [[ $# == 2 ]] || die 'usage: user-items USERNAME PROJECT_NUMBER'
    is_owner "$1" && is_uint "$2" || die 'invalid user project selector'
    list "users/$1/projectsV2/$2/items?per_page=100"
    ;;
  item)
    [[ $# == 3 || $# == 4 ]] || die 'usage: item OWNER PROJECT_NUMBER ITEM_ID [FIELD_IDS]'
    is_owner "$1" && is_uint "$2" && is_uint "$3" || die 'invalid item selector'
    endpoint="orgs/$1/projectsV2/$2/items/$3"
    if [[ $# == 4 ]]; then is_fields "$4" || die 'invalid field IDs'; endpoint="$endpoint?fields=$4"; fi
    get "$endpoint"
    ;;
  user-item)
    [[ $# == 3 || $# == 4 ]] || die 'usage: user-item USERNAME PROJECT_NUMBER ITEM_ID [FIELD_IDS]'
    is_owner "$1" && is_uint "$2" && is_uint "$3" || die 'invalid user item selector'
    endpoint="users/$1/projectsV2/$2/items/$3"
    if [[ $# == 4 ]]; then is_fields "$4" || die 'invalid field IDs'; endpoint="$endpoint?fields=$4"; fi
    get "$endpoint"
    ;;
  issue|pull)
    [[ $# == 3 ]] || die "usage: $command_name OWNER REPOSITORY NUMBER"
    is_owner "$1" && is_repo "$2" && is_uint "$3" || die "invalid $command_name selector"
    resource=issues; [[ $command_name == pull ]] && resource=pulls
    get "repos/$1/$2/$resource/$3"
    ;;
  checks)
    [[ $# == 3 ]] || die 'usage: checks OWNER REPOSITORY COMMIT_SHA'
    is_owner "$1" && is_repo "$2" && is_sha "$3" || die 'invalid check selector'
    get "repos/$1/$2/commits/$3/check-runs"
    ;;
  run)
    [[ $# == 3 ]] || die 'usage: run OWNER REPOSITORY RUN_ID'
    is_owner "$1" && is_repo "$2" && is_uint "$3" || die 'invalid run selector'
    get "repos/$1/$2/actions/runs/$3"
    ;;
  *) die 'supported commands: rate, project, fields, items, item, user-project, user-fields, user-items, user-item, issue, pull, checks, run' ;;
esac
