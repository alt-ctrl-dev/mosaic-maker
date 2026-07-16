const stages = [
	["Choose source image", "Select a JPEG, PNG, or WebP image."],
	["Set tessera size", "Choose the square size of each tessera."],
	["Choose tesserae", "Upload tesserae or create generated tesserae."],
	["Review tesserae", "Check the collection before building the mosaic."],
	["Generate and preview", "Build the mosaic and inspect the result."],
	["Export mosaic", "Download the full-resolution mosaic."],
] as const;

export function App() {
	return (
		<>
			<header className="container">
				<p className="eyebrow">Private, in-browser image making</p>
				<h1>Mosaic Maker</h1>
				<p>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<main className="container">
				<nav aria-label="Mosaic workflow">
					<ol className="workflow">
						{stages.map(([title, description], index) => (
							<li aria-current={index === 0 ? "step" : undefined} key={title}>
								<article>
									<span className="step-number" aria-hidden="true">
										{index + 1}
									</span>
									<div>
										<h2>{title}</h2>
										<p>{description}</p>
									</div>
								</article>
							</li>
						))}
					</ol>
				</nav>
			</main>
		</>
	);
}
