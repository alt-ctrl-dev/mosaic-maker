import { beforeEach, expect, it, vi } from "vitest";

const { render, trackDeviceAnalytics } = vi.hoisted(() => ({
	render: vi.fn(),
	trackDeviceAnalytics: vi.fn(),
}));

vi.mock("react-dom/client", () => ({ createRoot: () => ({ render }) }));
vi.mock("./telemetry", () => ({
	initializeTelemetry: vi.fn(),
	trackDeviceAnalytics,
}));
vi.mock("./App", () => ({ App: () => null }));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	document.body.innerHTML = '<div id="root"></div>';
});

it("renders the app without waiting for device analytics", async () => {
	trackDeviceAnalytics.mockReturnValue(new Promise(() => {}));

	await import("./main");
	const { App } = await import("./App");

	expect(render).toHaveBeenCalledOnce();
	expect(render.mock.calls[0]?.[0].props.children.type).toBe(App);
	expect(trackDeviceAnalytics).toHaveBeenCalledOnce();
});

it("keeps the app rendered if device analytics fails", async () => {
	const error = new Error("analytics unavailable");
	trackDeviceAnalytics.mockRejectedValue(error);
	const log = vi.spyOn(console, "error").mockImplementation(() => {});

	await import("./main");
	await Promise.resolve();

	expect(render).toHaveBeenCalledOnce();
	expect(log).toHaveBeenCalledWith("Failed to track device analytics:", error);
	log.mockRestore();
});
