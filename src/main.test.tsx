import { beforeEach, expect, it, vi } from "vitest";

const { render, collectDeviceAnalytics, setTelemetryFn } = vi.hoisted(() => {
	const collectDeviceAnalyticsFn = vi.fn();
	return {
		render: vi.fn(),
		collectDeviceAnalytics: collectDeviceAnalyticsFn,
		setTelemetryFn: vi.fn(),
	};
});

vi.mock("react-dom/client", () => ({ createRoot: () => ({ render }) }));
vi.mock("./telemetry-service", () => ({
	getTelemetry: () => ({
		collectDeviceAnalytics,
	}),
	setTelemetry: setTelemetryFn,
}));
vi.mock("./telemetry-faro-adapter", () => ({
	FaroTelemetryAdapter: class {},
	initializeFaroTelemetry: vi.fn(),
}));
vi.mock("./telemetry-logonly-adapter", () => ({
	LogOnlyTelemetryAdapter: class {},
}));
vi.mock("./App", () => ({ App: () => null }));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	document.body.innerHTML = '<div id="root"></div>';
});

it("renders the app without waiting for device analytics", async () => {
	collectDeviceAnalytics.mockReturnValue(new Promise(() => {}));

	await import("./main");
	const { App } = await import("./App");

	expect(render).toHaveBeenCalledOnce();
	expect(render.mock.calls[0]?.[0].props.children.type).toBe(App);
	expect(collectDeviceAnalytics).toHaveBeenCalledOnce();
});

it("keeps the app rendered if device analytics fails", async () => {
	const error = new Error("analytics unavailable");
	collectDeviceAnalytics.mockRejectedValue(error);
	const log = vi.spyOn(console, "error").mockImplementation(() => {});

	await import("./main");
	await Promise.resolve();

	expect(render).toHaveBeenCalledOnce();
	expect(log).toHaveBeenCalledWith("Failed to track device analytics:", error);
	log.mockRestore();
});
