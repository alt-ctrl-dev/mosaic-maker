# Security Policies

This document describes the browser and deployment security policies implemented in Mosaic Maker to protect users and maintainers.

## Browser Security Policies

### Content Security Policy (CSP)

A restrictive Content Security Policy is implemented via a meta tag in `index.html`:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
connect-src 'self';
worker-src 'self' blob:;
object-src 'none';
frame-ancestors 'none';
base-uri 'none';
form-action 'none';
```

Key aspects:
- Scripts are restricted to same-origin only, with limited unsafe-inline/eval for development
- Styles are restricted to same-origin only
- Images can be loaded from same-origin, blob URLs, and data URLs (necessary for image processing)
- Network connections are restricted to same-origin only (for telemetry when enabled)
- Web workers can only run same-origin scripts or blob URLs
- Object embedding is completely disabled
- Frame-ancestors is declared `'none'` in the meta policy; browsers ignore that directive in meta tags, so live framing protection still requires the response header documented below
- Base URLs and form actions are completely disabled

### Referrer Policy

Strict referrer policy is enforced:
```
strict-origin-when-cross-origin
```

This ensures that when navigating to external sites, only the origin (not the full URL) is sent as the referrer when the protocol security level stays the same (HTTPS→HTTPS). When the security level decreases (HTTPS→HTTP), no referrer information is sent.

### Permissions Policy

Powerful browser features are restricted via Permissions Policy:
```
geolocation=(), camera=(), microphone=(), payment=(), usb=(), autoplay=()
```

This prevents the application from accessing sensitive device capabilities that aren't needed for mosaic creation.

## Deployment Considerations

### Header-Based Protections

While the CSP and Referrer policies are implemented via meta tags, some protections require HTTP response headers:

1. **Frame-Ancestors**: While included in the meta CSP, this directive is only honored when delivered via HTTP headers. For full protection, hosting should enforce:
   ```
   Content-Security-Policy: frame-ancestors 'none'
   ```

2. **Other Headers**: Recommended additional headers for deployment:
   ```
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   X-XSS-Protection: 1; mode=block
   ```

### Static Hosting Compatibility

The current implementation works with static hosting services like GitHub Pages, but for maximum security, operators should configure their hosting to deliver additional security headers.

## Testing

Security policies are verified through automated tests in `src/browser-security.test.ts` that read the source `index.html` and check:

- Presence and correctness of the CSP meta tag directives
- Absence of wildcard and insecure network sources
- The strict referrer policy value
- Restricted permissions policy settings

## Trade-offs

### Development vs Production

The CSP allows `'unsafe-inline'` and `'unsafe-eval'` to support Hot Module Replacement (HMR) during development. In a production build, these allowances represent an acceptable risk trade-off since:

1. The application is fully client-side with no server-side processing
2. User data never leaves the browser
3. The application performs intensive image processing that requires blob/data URLs

### Image Processing Requirements

The `img-src` directive allows `blob:` and `data:` URLs because the application needs to:
- Process user-provided images in the browser
- Generate preview images and mosaics
- Export final results as downloadable files

These allowances are necessary for core functionality and don't represent a security risk since all processing happens locally.

## Future Improvements

Operators may consider:
- Implementing HTTP Strict Transport Security (HSTS) at the hosting level
- Configuring feature-specific security headers
- Setting up automated security scanning
- Regular review of CSP directives as functionality evolves
