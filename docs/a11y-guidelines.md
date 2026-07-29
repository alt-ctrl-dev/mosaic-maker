# Accessibility Guidelines for Mosaic Maker

This document outlines the accessibility requirements and guidelines for the Mosaic Maker application, ensuring compliance with WCAG 2.2 AA standards and broad device support.

## Core Accessibility Requirements

### Keyboard Navigation
- All interactive elements must be operable via keyboard
- Logical focus order follows visual reading order (left-to-right, top-to-bottom)
- Focus indicators are clearly visible (2px outline with good contrast)
- Tab traps are used appropriately (e.g., in modals, file dialogs)
- Common keyboard shortcuts supported:
  - Tab/Shift+Tab: Move between interactive elements
  - Enter/Space: Activate buttons and controls
  - Escape: Cancel/close operations
  - Arrow keys: Navigate within grouped controls

### Screen Reader Support
- Semantic HTML structure with appropriate heading levels (h1-h6)
- ARIA roles, states, and properties used correctly
- Live regions for dynamic content updates (progress, errors, status)
- Form labels properly associated with inputs
- Descriptive link text (avoid generic labels like "click here")
- Alternative text for images (including mosaic preview)

### Visual Design
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text (18pt+ or 14pt+ bold)
- Focus indicators visible against all backgrounds
- Color is not the only means of conveying information
- Text can be resized up to 200% without loss of content/functionality
- Responsive design works on mobile, tablet, and desktop

### Reduced Motion
- Animations and transitions respect `prefers-reduced-motion` media query
- Auto-playing content can be paused, stopped, or hidden
- Loading indicators are still visible in reduced motion mode

## Component-Specific Guidelines

### Workflow Navigation
- Current step clearly indicated with `aria-current="step"`
- Previous steps are links to return to (when appropriate)
- Future steps are disabled or not focusable

### File Upload Components
- Support both click-to-upload and drag-and-drop (keyboard operable)
- Clear instructions for keyboard users
- Progress indicators for file processing
- Error messages associated with specific files
- File input has accessible labels

### Progress Indicators
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Provide textual progress updates for screen readers
- Visual progress bar with clear percentage display
- Estimated time remaining when applicable

### Controls and Forms
- All form inputs have associated labels
- Required fields clearly marked
- Error messages programmatically associated with inputs
- Group related controls with `<fieldset>` and `<legend>`
- Use appropriate input types (number, range, etc.)

### Dialogs and Modals
- Proper focus management (trap focus within dialog)
- Escape key closes dialog
- Return focus to triggering element after closing
- Overlay behind dialog is hidden from screen readers (`aria-hidden`)
- Dialog has appropriate `role="dialog"` and label

## Testing Requirements

### Automated Testing
- Run accessibility tools (axe-core) as part of CI process
- Check for common issues (missing labels, contrast problems, etc.)

### Manual Testing
- Navigate entire workflow using keyboard only
- Test with screen readers (NVDA, VoiceOver, JAWS)
- Verify reduced motion preferences are honored
- Check responsive layouts on various device sizes
- Validate color contrast with tools like axe DevTools

### Unit Testing
- Test accessibility utilities (`FocusManager`, `ScreenReaderAnnouncer`, etc.)
- Verify keyboard event handling in interactive components
- Check focus management behavior in complex components

## Implementation Utilities

The `accessibility-utils.ts` file provides several helper classes:

### FocusManager
- `moveFocus()`: Move focus between elements with wrapping
- `getFocusableElements()`: Get all focusable elements in a container
- `trapFocus()`: Keep focus within a container (for dialogs, etc.)

### ScreenReaderAnnouncer
- `announce()`: Send messages to screen readers via live regions

### ReducedMotion
- `prefersReducedMotion()`: Check system preference
- `applyReducedMotionClass()`: Apply class when needed

### KeyboardUtils
- Helpers for common keyboard event detection
- `isEnterKey()`, `isSpaceKey()`, `isEscapeKey()`, `isActivationKey()`

## Device Support Requirements

### Responsive Design
- Mobile-first approach
- Breakpoints for common device sizes
- Touch targets at least 44px by 44px
- No horizontal scrolling on mobile devices

### Browser Support
- Chrome, Edge, Firefox, and Safari (current versions)
- Graceful degradation for older browsers
- Feature detection rather than browser detection

### Performance Expectations
- UI controls respond within 100ms
- Progress indication appears within 1 second
- Cancellation completes within 1 second
- Preflight checks for device capacity before processing

## Future Considerations

### Localization
- Text direction support (LTR/RTL)
- Proper language attributes
- String externalization for translation

### Enhanced Screen Reader Support
- Landmark roles for navigation regions
- Skip links for direct content access
- ARIA live regions for dynamic updates

### Cognitive Accessibility
- Clear error recovery paths
- Consistent navigation patterns
- Simplified instructions for complex features