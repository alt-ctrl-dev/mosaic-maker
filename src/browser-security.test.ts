import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const moduleUrl = import.meta.url;
const indexHtml = readFileSync(new URL("../index.html", moduleUrl), "utf-8");

function getMetaContent(httpEquiv: string): string {
	const match = indexHtml.match(
		new RegExp(`<meta http-equiv="${httpEquiv}" content="([^"]+)"`),
	);
	if (match === null) {
		throw new Error(`Missing ${httpEquiv} meta tag in index.html`);
	}
	return match[1];
}

describe("browser security policies", () => {
	it("declares a restrictive Content Security Policy", () => {
		const csp = getMetaContent("Content-Security-Policy");

		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
		expect(csp).toContain("style-src 'self' 'unsafe-inline'");
		expect(csp).toContain("img-src 'self' blob: data:");
		expect(csp).toContain("connect-src 'self'");
		expect(csp).toContain("worker-src 'self' blob:");
		expect(csp).toContain("object-src 'none'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("base-uri 'none'");
		expect(csp).toContain("form-action 'none'");
	});

	it("forbids wildcard and insecure network sources", () => {
		const csp = getMetaContent("Content-Security-Policy");

		expect(csp).not.toContain("*:");
		expect(csp).not.toContain("http:");
	});

	it("sends only the origin as referrer across origins", () => {
		expect(getMetaContent("Referrer-Policy")).toBe(
			"strict-origin-when-cross-origin",
		);
	});

	it("disables unused powerful browser capabilities", () => {
		const permissions = getMetaContent("Permissions-Policy");

		for (const feature of [
			"geolocation",
			"camera",
			"microphone",
			"payment",
			"usb",
			"autoplay",
		]) {
			expect(permissions).toContain(`${feature}=()`);
		}
	});
});
