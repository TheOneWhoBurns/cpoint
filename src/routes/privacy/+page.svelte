<svelte:head>
	<title>Privacy Policy - Rental Manager</title>
</svelte:head>

<div class="privacy">
	<div class="content">
		<a href="/home" class="back-link md-body-medium">
			<span class="material-symbols-rounded">arrow_back</span>
			Back to Home
		</a>

		<h1 class="md-headline-large">Privacy Policy</h1>
		<p class="md-body-small updated">Last updated: February 2026</p>

		<section>
			<h2 class="md-title-large">Overview</h2>
			<p class="md-body-large">
				Rental Manager is an internal equipment rental and point-of-sale management system.
				This policy describes how we handle data within the application.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Data We Collect</h2>
			<p class="md-body-large">
				The application stores data necessary for rental operations, including:
			</p>
			<ul class="md-body-large">
				<li>Operator names and authentication credentials</li>
				<li>Guide names and availability status</li>
				<li>Equipment inventory and rental records</li>
				<li>Sales transaction records</li>
				<li>Shift logs and operational data</li>
			</ul>
		</section>

		<section>
			<h2 class="md-title-large">Google API Usage</h2>
			<p class="md-body-large">
				This application uses Google APIs (Sheets and Drive) solely to export shift reports.
				We only access data you explicitly authorize and do not share it with third parties.
				Our use of Google API data adheres to the
				<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
					Google API Services User Data Policy</a>, including the Limited Use requirements.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Data Storage</h2>
			<p class="md-body-large">
				All data is stored on a secure server. We do not sell, share, or transfer data to
				third parties beyond what is described above.
			</p>
		</section>

		<section>
			<h2 class="md-title-large">Contact</h2>
			<p class="md-body-large">
				For questions about this policy, contact the system administrator.
			</p>
		</section>
	</div>

	<footer class="privacy-footer">
		<a href="/home" class="md-body-small">Home</a>
	</footer>
</div>

<style>
	.privacy {
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

	.privacy-footer {
		padding: var(--md-sys-spacing-md);
		text-align: center;
	}

	.privacy-footer a {
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: none;
	}

	.privacy-footer a:hover {
		text-decoration: underline;
	}
</style>
