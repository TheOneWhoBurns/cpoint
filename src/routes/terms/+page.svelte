<svelte:head>
	<title>Terms of Service - Rental Manager</title>
</svelte:head>

<div class="terms">
	<div class="content">
		<a href="/home" class="back-link md-body-medium">
			<span class="material-symbols-rounded">arrow_back</span>
			Back to Home
		</a>

		<h1 class="md-headline-large">Terms of Service</h1>
		<p class="md-body-small updated">Last updated: February 2026</p>

		<section>
			<h2 class="md-title-large">Acceptance of Terms</h2>
			<p class="md-body-large">
				By accessing and using Rental Manager, you agree to be bound by these terms of service.
				This application is intended for authorized operators and staff only.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Use of the Application</h2>
			<p class="md-body-large">
				Rental Manager is an internal tool for managing equipment rentals, point-of-sale operations,
				and shift tracking. Access is restricted to authorized personnel with valid credentials.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">User Responsibilities</h2>
			<ul class="md-body-large">
				<li>Keep your login credentials secure and do not share them</li>
				<li>Use the application only for its intended business purposes</li>
				<li>Report any unauthorized access or security concerns to the administrator</li>
				<li>Ensure accuracy of rental and sales data entered into the system</li>
			</ul>
		</section>

		<section>
			<h2 class="md-title-large">Google Services</h2>
			<p class="md-body-large">
				This application integrates with Google APIs for report export functionality.
				Use of these features is subject to
				<a href="https://policies.google.com/terms" target="_blank" rel="noopener">Google's Terms of Service</a>.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Limitation of Liability</h2>
			<p class="md-body-large">
				The application is provided "as is" without warranties of any kind.
				We are not liable for any damages arising from the use of this application.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Contact</h2>
			<p class="md-body-large">
				For questions about these terms, contact the system administrator.
			</p>
		</section>
	</div>

	<footer class="terms-footer">
		<a href="/home" class="md-body-small">Home</a>
		<span class="md-body-small separator">|</span>
		<a href="/privacy" class="md-body-small">Privacy Policy</a>
	</footer>
</div>

<style>
	.terms {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--md-sys-color-surface);
	}

	.content {
		flex: 1;
		max-width: 720px;
		margin: 0 auto;
		padding: var(--md-sys-spacing-xl) var(--md-sys-spacing-md);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-primary);
		text-decoration: none;
		margin-bottom: var(--md-sys-spacing-lg);
	}

	.back-link:hover {
		text-decoration: underline;
	}

	h1 {
		color: var(--md-sys-color-on-surface);
		margin: 0 0 var(--md-sys-spacing-xs);
	}

	.updated {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0 0 var(--md-sys-spacing-xl);
	}

	section {
		margin-bottom: var(--md-sys-spacing-xl);
	}

	h2 {
		color: var(--md-sys-color-on-surface);
		margin: 0 0 var(--md-sys-spacing-sm);
	}

	p {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
	}

	ul {
		color: var(--md-sys-color-on-surface-variant);
		margin: var(--md-sys-spacing-sm) 0 0;
		padding-left: var(--md-sys-spacing-lg);
	}

	li {
		margin-bottom: var(--md-sys-spacing-xs);
	}

	section a {
		color: var(--md-sys-color-primary);
	}

	.terms-footer {
		padding: var(--md-sys-spacing-md);
		text-align: center;
	}

	.terms-footer a {
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: none;
	}

	.terms-footer a:hover {
		text-decoration: underline;
	}

	.separator {
		color: var(--md-sys-color-outline);
		margin: 0 var(--md-sys-spacing-sm);
	}
</style>
