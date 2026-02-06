<svelte:head>
	<title>Rental Manager</title>
</svelte:head>

<div class="home">
	<div class="hero">
		<span class="material-symbols-rounded hero-icon">point_of_sale</span>
		<h1 class="md-display-small">Rental Manager</h1>
		<p class="md-body-large subtitle">Equipment rental and point-of-sale management</p>
		<a href="/login" class="login-link">
			<span class="material-symbols-rounded">login</span>
			Go to Login
		</a>
	</div>

	<footer class="home-footer">
		<a href="/privacy" class="md-body-small">Privacy Policy</a>
		<span class="md-body-small separator">|</span>
		<a href="/terms" class="md-body-small">Terms of Service</a>
	</footer>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--md-sys-color-surface);
	}

	.hero {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-xxl);
		text-align: center;
	}

	.hero-icon {
		font-size: 72px;
		color: var(--md-sys-color-primary);
	}

	h1 {
		color: var(--md-sys-color-on-surface);
		margin: 0;
	}

	.subtitle {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
	}

	.login-link {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-top: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		border-radius: var(--md-sys-shape-corner-full);
		text-decoration: none;
		font: var(--md-sys-typescale-label-large);
		height: 40px;
	}

	.login-link:hover {
		box-shadow: var(--md-sys-elevation-level1);
	}

	.home-footer {
		padding: var(--md-sys-spacing-md);
		text-align: center;
	}

	.home-footer a {
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: none;
	}

	.home-footer a:hover {
		text-decoration: underline;
	}

	.separator {
		color: var(--md-sys-color-outline);
		margin: 0 var(--md-sys-spacing-sm);
	}
</style>
