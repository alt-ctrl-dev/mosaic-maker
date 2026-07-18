# Coding Standards

## Style

- Use clear names and straightforward control flow.
- Avoid unnecessary complexity, nesting, and abstractions.
- Do not add comments that merely restate what the code makes clear.
- Use the glossary terms defined in `CONTEXT.md` across code, tests, and specifications. Avoid synonyms that the glossary rejects.

## Type Safety

- Do not bypass type safety with `any` or unchecked assertions.
- Validate data at trust boundaries.

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
