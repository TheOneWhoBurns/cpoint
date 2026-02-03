<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	let { data } = $props();
	let disconnecting = $state(false);
	let error = $state('');
	let success = $state('');
	let shareEmail = $state(data.shareEmail);
	let savingEmail = $state(false);

	// Check URL params for feedback from OAuth callback
	$effect(() => {
		const params = $page.url.searchParams;
		if (params.get('success') === 'connected') {
			success = 'Google account connected successfully.';
		}
		if (params.get('error') === 'access_denied') {
			error = 'Google authorization was denied. You must grant permissions to use Sheets export.';
		}
		if (params.get('error') === 'auth_failed') {
			error = 'Failed to connect Google account. Please try again.';
		}
		if (params.get('error') === 'no_code') {
			error = 'Google authorization was cancelled.';
		}
		if (params.get('error') === 'not_configured') {
			error = 'Google OAuth credentials are not configured on the server.';
		}
		// Clear URL params so messages don't persist on refresh
		if (params.has('success') || params.has('error')) {
			const cleanUrl = $page.url.pathname;
			history.replaceState(history.state, '', cleanUrl);
		}
	});

	async function handleDisconnect() {
		disconnecting = true;
		error = '';
		success = '';
		try {
			const res = await fetch('/api/google/disconnect', { method: 'POST' });
			if (res.ok) {
				success = 'Google account disconnected.';
				await invalidateAll();
			} else {
				error = 'Failed to disconnect.';
			}
		} catch {
			error = 'Failed to disconnect.';
		}
		disconnecting = false;
	}

	async function handleSaveEmail() {
		savingEmail = true;
		error = '';
		success = '';
		try {
			const res = await fetch('/api/google/share-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: shareEmail.trim() })
			});
			if (res.ok) {
				success = shareEmail.trim()
					? 'Share email saved. New reports will be shared with this address.'
					: 'Share email removed.';
				await invalidateAll();
			} else {
				error = 'Failed to save share email.';
			}
		} catch {
			error = 'Failed to save share email.';
		}
		savingEmail = false;
	}
</script>

<div class="settings-page">
	<section class="settings-section">
		<h3 class="md-title-medium section-title">Google Sheets Integration</h3>
		<p class="md-body-medium section-desc">
			Connect a Google account to automatically export shift reports to Google Sheets instead of downloading Excel files.
		</p>

		{#if error}
			<div class="alert alert-error">
				<span class="material-symbols-rounded">error</span>
				<span class="md-body-medium">{error}</span>
			</div>
		{/if}

		{#if success}
			<div class="alert alert-success">
				<span class="material-symbols-rounded">check_circle</span>
				<span class="md-body-medium">{success}</span>
			</div>
		{/if}

		{#if !data.googleConfigured}
			<div class="alert alert-error">
				<span class="material-symbols-rounded">warning</span>
				<span class="md-body-medium">
					Google OAuth credentials not configured. Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>ORIGIN</code> environment variables to enable this feature.
				</span>
			</div>
		{/if}

		<div class="connection-card">
			<div class="connection-status">
				<div class="status-icon" class:connected={data.googleConnected}>
					<span class="material-symbols-rounded">
						{data.googleConnected ? 'link' : 'link_off'}
					</span>
				</div>
				<div class="status-text">
					<span class="md-title-small">
						{data.googleConnected ? 'Google Account Connected' : 'Not Connected'}
					</span>
					<span class="md-body-small status-detail">
						{data.googleConnected
							? 'Shift reports will be exported to Google Sheets.'
							: 'Connect a Google account to enable Google Sheets export.'}
					</span>
				</div>
			</div>

			<div class="connection-actions">
				{#if data.googleConnected}
					<md-outlined-button
						disabled={disconnecting}
						onclick={handleDisconnect}
					>
						<span class="material-symbols-rounded" slot="icon">link_off</span>
						{disconnecting ? 'Disconnecting...' : 'Disconnect'}
					</md-outlined-button>
					<a href="/api/google/connect">
						<md-filled-button>
							<span class="material-symbols-rounded" slot="icon">refresh</span>
							Reconnect
						</md-filled-button>
					</a>
				{:else}
					<a href="/api/google/connect" class:disabled-link={!data.googleConfigured}>
						<md-filled-button disabled={!data.googleConfigured}>
							<span class="material-symbols-rounded" slot="icon">link</span>
							Connect Google Account
						</md-filled-button>
					</a>
				{/if}
			</div>
		</div>
	</section>

	{#if data.googleConnected}
		<section class="settings-section">
			<h3 class="md-title-medium section-title">Share Reports</h3>
			<p class="md-body-medium section-desc">
				Optionally share newly created reports with another Google account. This grants edit access to each new spreadsheet.
			</p>

			<div class="share-card">
				<div class="share-form">
					<md-outlined-text-field
						label="Share email address"
						type="email"
						value={shareEmail}
						oninput={(e: Event) => { shareEmail = (e.target as HTMLInputElement).value; }}
						placeholder="user@example.com"
						style="flex: 1;"
					></md-outlined-text-field>
					<md-filled-button
						disabled={savingEmail}
						onclick={handleSaveEmail}
					>
						<span class="material-symbols-rounded" slot="icon">save</span>
						{savingEmail ? 'Saving...' : 'Save'}
					</md-filled-button>
				</div>
			</div>
		</section>
	{/if}

	<section class="settings-section">
		<h3 class="md-title-medium section-title">How It Works</h3>
		<div class="info-card">
			<div class="info-step">
				<div class="step-number">1</div>
				<div>
					<span class="md-title-small">Connect</span>
					<p class="md-body-small">Click "Connect Google Account" and sign in with the Google account where reports should be stored.</p>
				</div>
			</div>
			<div class="info-step">
				<div class="step-number">2</div>
				<div>
					<span class="md-title-small">Authorize</span>
					<p class="md-body-small">Grant permission to create and manage spreadsheets. Only files created by this app can be accessed.</p>
				</div>
			</div>
			<div class="info-step">
				<div class="step-number">3</div>
				<div>
					<span class="md-title-small">Export</span>
					<p class="md-body-small">When a shift ends, the report is automatically created as a Google Sheets document and opens in a new tab.</p>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xl);
		max-width: 800px;
	}

	.settings-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.section-title {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.section-desc {
		margin: 0;
		color: var(--md-sys-color-on-surface-variant);
	}

	.alert {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.alert-error {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.alert-success {
		background: var(--md-sys-color-success-container, #d1fae5);
		color: var(--md-sys-color-on-success-container, #065f46);
	}

	.connection-card {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xl);
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-large);
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
	}

	.status-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--md-sys-shape-corner-full);
		background: var(--md-sys-color-error-container);
		flex-shrink: 0;
	}

	.status-icon .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-on-error-container);
	}

	.status-icon.connected {
		background: var(--md-sys-color-success-container, #d1fae5);
	}

	.status-icon.connected .material-symbols-rounded {
		color: var(--md-sys-color-on-success-container, #065f46);
	}

	.status-text {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.status-detail {
		color: var(--md-sys-color-on-surface-variant);
	}

	.connection-actions {
		display: flex;
		gap: var(--md-sys-spacing-md);
		flex-wrap: wrap;
	}

	.connection-actions a {
		text-decoration: none;
	}

	.disabled-link {
		pointer-events: none;
	}

	code {
		background: var(--md-sys-color-surface-container-high);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.85em;
	}

	.share-card {
		padding: var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-large);
	}

	.share-form {
		display: flex;
		align-items: flex-end;
		gap: var(--md-sys-spacing-md);
	}

	.info-card {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface-container);
		border-radius: var(--md-sys-shape-corner-large);
	}

	.info-step {
		display: flex;
		align-items: flex-start;
		gap: var(--md-sys-spacing-md);
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--md-sys-shape-corner-full);
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		font-weight: 500;
		flex-shrink: 0;
	}

	.info-step span {
		color: var(--md-sys-color-on-surface);
	}

	.info-step p {
		margin: var(--md-sys-spacing-xs) 0 0;
		color: var(--md-sys-color-on-surface-variant);
	}

	@media (max-width: 768px) {
		.connection-card {
			padding: var(--md-sys-spacing-lg);
		}

		.connection-status {
			flex-direction: column;
			text-align: center;
		}

		.share-form {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
