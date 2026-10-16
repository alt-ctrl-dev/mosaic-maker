import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { IntroDialog } from "./IntroDialog";

afterEach(() => {
	localStorage.clear();
});

describe("IntroDialog", () => {
	it("explains the app on first visit", () => {
		render(
			<Provider store={createStore()}>
				<IntroDialog />
			</Provider>,
		);

		// jsdom never opens the popover, so the dialog stays out of the
		// a11y tree and computes no name; assert the label directly.
		expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
			"aria-label",
			"Welcome to Mosaic Maker",
		);
		expect(
			screen.getByText(/turns one photo into a mosaic/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/your photos never leave your device/i),
		).toBeInTheDocument();
	});

	it("closes with the button and stays closed on later visits", () => {
		const first = render(
			<Provider store={createStore()}>
				<IntroDialog />
			</Provider>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Close", hidden: true }),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		first.unmount();

		// A fresh store must read the persisted dismissal from storage.
		render(
			<Provider store={createStore()}>
				<IntroDialog />
			</Provider>,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
