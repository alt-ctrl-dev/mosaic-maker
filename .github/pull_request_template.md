# Title
**Format:**
```
<type>: <short description>

<optional body explaining why, not what>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Tooling, dependencies, config


## Summary

<!-- What changed (concretely) and why (the intent/problem solved)? 2-3 sentences. -->

## Verification

<!-- Run these checks and check the boxes -->

- [ ] Tests pass (`npm test`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Lint and formatting pass (`npm run lint`)
- [ ] Changes self-reviewed

## Code analysis

### Key changes
- **Files/Modules**: What changed and why
- **New patterns/utilities**: When and how to use them
- **Refactoring**: What was simplified and by how much

### Technical considerations
- **Performance/metrics**: Measurable impact (or negligible)
- **Complexity**: Cognitive load, edge cases, assumptions
- **Error handling**: Added safeguards or validation
- **Trade-offs**: What was chosen and why alternatives weren't

### Review focus areas
<!-- Call out specific areas needing attention -->
- [ ] Logic complexity hotspots or hard-to-follow code paths
- [ ] Risky edge cases, potential bugs, or assumptions
- [ ] Areas needing thorough testing or manual verification
- [ ] Security or data integrity considerations

## Changes

<!-- Organized by file/module -->
- **New files/modules**: Purpose
- **Modified functions/logic**: Key intent
- **Added/removed dependencies**: Why
- **Configuration/schema changes**: What shifted

## References

<!-- Reference any issues, PRDs, specs, etc. -->

Closes #<issue-id/>
