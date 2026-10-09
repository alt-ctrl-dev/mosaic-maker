# Coding Standards

## Style

- Use clear names and straightforward control flow.
- Avoid unnecessary complexity, nesting, and abstractions.
- Do not add comments that merely restate what the code makes clear.
- Use the glossary terms defined in `CONTEXT.md` across code, tests, and specifications. Avoid synonyms that the glossary rejects.

## Documentation

- Every export (function, const, interface, type, enum) must have a preceding JSDoc block with a summary description.
- JSDoc comments should provide semantic context (units, behavior, non-obvious constraints) beyond what descriptive names and type signatures convey.
- Do not add redundant interface-level JSDoc or constant comments that merely restate what the code already makes clear.
- Documentation must add information value beyond what the code itself expresses.

## Type Safety

- Do not bypass type safety with `any` or unchecked assertions.
- Validate data at trust boundaries.

## Styling

- All styling is StyleX; there are no CSS files. Design tokens live in `src/styles/tokens.stylex.ts` (defined via `stylex.defineVars`, with dark-mode overrides) and shared element styles in `src/styles/base.stylex.ts`. Consume tokens through the exported object; never reference the generated `var(--…)` names directly.
- Status panels (processing indicators, generation progress/info, and error/warning messages) must delegate their visual container styling to the shared card style in `src/styles/base.stylex.ts`. Do not declare `background-color` or `color` on these panels so they stay consistent across colour schemes.
- StyleX only resolves computed conditional keys (e.g. `[REDUCED_MOTION]`) when the constant is defined in the same module; keep media-query constants local to each file.

## Testing

- Add tests for new or changed behavior.
- Add regression tests for bug fixes.
- Run the relevant tests and type checks for each change; do not commit with failing checks.

## Architecture

- Keep modules focused; do not combine unrelated concerns.
- Follow relevant ADRs and explicitly flag conflicts rather than silently overriding them.
- Refactors must preserve observable behavior unless a behavior change is explicitly required.

## Security

- Do not introduce injection vulnerabilities.
- Do not expose credentials or other secrets.
