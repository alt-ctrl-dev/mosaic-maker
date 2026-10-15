# Ports and adapters for telemetry

Telemetry lived in a single module that imported the Grafana Faro SDK directly, with ~14 call sites importing the concrete module and component tests isolating themselves by mocking its path. We decided to put telemetry behind a `TelemetryService` port with pluggable adapters (Faro sending, log-only, and in-memory recording for tests), reached through a module-level seam registered at app startup. This buys test isolation, backend swappability, and layering hygiene at the cost of one extra interface.

## Considered options

- **Direct Faro import (status quo):** simplest, but couples every call site and test to the SDK.
- **Facade functions delegating to a hidden service:** smaller diff, but leaves two parallel tracking surfaces forever.
- **React context / explicit DI:** the app has no DI infrastructure, and context ceremony in every component was not justified.

## Consequences

- Call sites and tests depend on the typed port. Event and attribute names on the wire are frozen so the Grafana dashboards keep working untouched.
- Consent gates adapter choice at startup only; a runtime toggle persists and applies on next load. The three storage keys (consent, session, device id) are part of the user-facing contract and must not be renamed — renaming the consent key would silently re-enroll opted-out users because consent defaults to granted.