# AAA documentation

Start with the canonical [AAA project charter](AAA-PROJECT-CHARTER.md) for mission, current capabilities, operating rules, and roadmap, then the [token economics and launch plan](AAA-TOKENOMICS.md) for the separate fee and donation allocations and unresolved launch choices. The [repository overview](../README.md) and website summarize these documents.

**$AAA has not launched.** Funding allocations and future audit workers are plans; engineering notes, scripts, and historical audit reports do not authorize a launch, spending, deployment, or new audit job.

## Developer entry points

| Work area | Start here |
| --- | --- |
| Architecture and source layout | [Project structure](project-structure.md) and the [repository map](../README.md#repository-map) |
| Scanner engine | [Scanner guide](../scanners/README.md), [package scripts](../scanners/package.json), and [network configuration](network-configuration.md) |
| Backend and local authentication | [Backend package scripts](../server/backend/package.json), [current auth service](../server/backend/services/auth.service.js), [local user setup script](../server/backend/scripts/create-local-user.js), and [database schema](database-schema.md) |
| Website and dashboard | [Frontend development guide](../server/frontend-next/README.md) and [package scripts](../server/frontend-next/package.json) |
| Source storage | [Source-code storage](source-code-storage.md) and [verified-source improvements](verified-source-improvements.md) |
| Helper contracts | [Contract sources](../contract/src/) and [package scripts](../contract/package.json) |

Use an isolated development checkout, database, and credentials. Check the current source and package scripts before following older command examples. Some component guides retain historical names, URLs, counts, or deployment instructions; the charter governs project status and approval boundaries. Keep credentials, private operator configuration, production access details, and undisclosed findings out of public documentation and Git.

The older `LOCAL-AUTH-SETUP.md` describes superseded GitHub OAuth configuration. Follow the current local-auth source and setup script above; do not change a production OAuth callback for local development.

## Engineering references

- [API performance optimization](api-performance-optimization.md)
- [Caching strategy](caching-strategy.md)
- [Materialized views](materialized-views.md)
- [Connection pool management](connection-pool-management.md)
- [Historical getLogs optimization](GETLOGS_OPTIMIZATION.md)
- [API comparison](api-comparison.md)
- [Engineering changelog](CHANGELOG.md)

Performance measurements and resource settings in these references describe their original context. Revalidate them for the current environment before changing database settings, clearing caches, installing schedules, or running maintenance.
