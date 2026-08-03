# Operations reference

Use `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2026-03-10` for Project v2 REST endpoints.

## REST routing

| Capability | Method and path |
| --- | --- |
| Project | `GET /orgs/{org}/projectsV2/{number}` |
| Fields | `GET /orgs/{org}/projectsV2/{number}/fields` |
| Items | `GET /orgs/{org}/projectsV2/{number}/items` |
| Item with selected fields | `GET /orgs/{org}/projectsV2/{number}/items/{id}?fields=1,2` |
| Update item fields | `PATCH /orgs/{org}/projectsV2/{number}/items/{id}` with `{"fields":[{"id":123,"value":"value"}]}` |
| User-owned Project variants | Replace `/orgs/{org}` with `/users/{username}` |
| Issue | `GET /repos/{owner}/{repo}/issues/{number}` |
| Pull request | `GET /repos/{owner}/{repo}/pulls/{number}` |
| Commit checks | `GET /repos/{owner}/{repo}/commits/{sha}/check-runs` |
| Actions run | `GET /repos/{owner}/{repo}/actions/runs/{id}` |
| Rate state | `GET /rate_limit` |

Project item mutations require organization Projects write permission. Issue and pull request mutations require their corresponding repository permission. Use a short-lived GitHub App installation token when practical.

## Rate behavior

- REST core and GraphQL have independent primary budgets.
- User PATs, OAuth tokens, and user access tokens contribute to the same per-user budget.
- GitHub App installation tokens have an installation budget and are the preferred isolation boundary for shared automation.
- Do not retry a `403` or `429` until the declared reset or `Retry-After` time.
- Prefer webhooks to polling. When polling is unavoidable, use bounded REST polling and stop after a declared deadline.

Official references:

- https://docs.github.com/en/rest/projects/projects?apiVersion=2026-03-10
- https://docs.github.com/en/rest/projects/items?apiVersion=2026-03-10
- https://docs.github.com/en/rest/projects/fields?apiVersion=2026-03-10
- https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api
- https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
