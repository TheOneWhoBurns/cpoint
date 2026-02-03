<script lang="ts">
	import { goto } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/text-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/progress/circular-progress.js';

	let { data } = $props();

	let selectedAdmin: typeof data.adminOperators[0] | null = $state(null);
	let passcode = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		if (!selectedAdmin) {
			error = 'Please select an admin';
			return;
		}
		if (passcode.length !== 4) {
			error = 'Passcode must be 4 digits';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ operatorId: selectedAdmin.id, passcode })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to log in';
				loading = false;
				return;
			}

			goto('/admin');
		} catch {
			error = 'Connection error';
			loading = false;
		}
	}

	function selectAdmin(admin: typeof data.adminOperators[0]) {
		selectedAdmin = admin;
		error = '';
	}

	function handleBack() {
		selectedAdmin = null;
		passcode = '';
		error = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && selectedAdmin && passcode.length === 4) {
			handleLogin();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="login-page">
	<div class="login-card">
		<header class="login-header">
			<div class="logo-container">
				<span class="material-symbols-rounded filled logo-icon">admin_panel_settings</span>
			</div>
			<h1 class="md-headline-medium">Admin Login</h1>
			<p class="md-body-medium subtitle">Select your admin profile and enter your passcode</p>
		</header>

		{#if data.adminOperators.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded icon-lg">shield_person</span>
				<p class="md-body-medium">No admin operators configured</p>
				<p class="md-body-small">An operator must be marked as admin in the database to access this panel.</p>
			</div>
		{:else}
			<section class="admin-section" class:dimmed={selectedAdmin !== null}>
				<div class="section-header">
					<span class="material-symbols-rounded">person</span>
					<h2 class="md-title-medium">Select admin</h2>
				</div>
				<div class="admin-grid">
					{#each data.adminOperators as admin}
						<button
							class="admin-card"
							class:selected={selectedAdmin?.id === admin.id}
							onclick={() => selectAdmin(admin)}
						>
							<div class="avatar">
								<span class="avatar-letter">{admin.name.charAt(0).toUpperCase()}</span>
							</div>
							<span class="admin-name md-label-large">{admin.name}</span>
							{#if selectedAdmin?.id === admin.id}
								<span class="material-symbols-rounded filled check-icon">check_circle</span>
							{/if}
						</button>
					{/each}
				</div>
			</section>

			{#if selectedAdmin}
				<section class="passcode-section">
					<div class="section-header">
						<span class="material-symbols-rounded">pin</span>
						<h2 class="md-title-medium">Enter passcode for {selectedAdmin.name}</h2>
					</div>

					<div class="passcode-input-container">
						<md-outlined-text-field
							label="4-digit passcode"
							type="password"
							maxlength="4"
							pattern="[0-9]*"
							inputmode="numeric"
							value={passcode}
							oninput={(e: Event) => passcode = (e.target as HTMLInputElement).value}
							error={!!error}
							error-text={error}
							supporting-text="Enter your admin passcode"
						>
							<span class="material-symbols-rounded" slot="leading-icon">lock</span>
						</md-outlined-text-field>
					</div>

					{#if error}
						<div class="error-banner">
							<span class="material-symbols-rounded">error</span>
							<span class="md-body-medium">{error}</span>
						</div>
					{/if}

					<div class="actions">
						<md-text-button onclick={handleBack} disabled={loading}>
							Back
						</md-text-button>
						<md-filled-button onclick={handleLogin} disabled={loading || passcode.length !== 4}>
							{#if loading}
								<md-circular-progress indeterminate aria-label="Loading"></md-circular-progress>
							{:else}
								<span class="material-symbols-rounded" slot="icon">login</span>
								Log In
							{/if}
						</md-filled-button>
					</div>
				</section>
			{/if}
		{/if}

		<footer class="login-footer">
			<a href="/login">
				<md-text-button>
					<span class="material-symbols-rounded" slot="icon">arrow_back</span>
					Back to Operator Login
				</md-text-button>
			</a>
		</footer>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: var(--md-sys-spacing-lg);
		background: linear-gradient(
			135deg,
			var(--md-sys-color-surface-container-low) 0%,
			var(--md-sys-color-surface-container) 100%
		);
	}

	.login-card {
		width: 100%;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xl);
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		box-shadow: var(--md-sys-elevation-level3);
	}

	.login-header {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.logo-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 72px;
		height: 72px;
		background: var(--md-sys-color-primary-container);
		border-radius: var(--md-sys-shape-corner-large);
		margin-bottom: var(--md-sys-spacing-sm);
	}

	.logo-icon {
		font-size: 36px;
		color: var(--md-sys-color-on-primary-container);
	}

	.login-header h1 {
		color: var(--md-sys-color-on-surface);
		margin: 0;
	}

	.subtitle {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-md);
		color: var(--md-sys-color-on-surface);
	}

	.section-header h2 { margin: 0; }

	.section-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
	}

	.admin-section {
		transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
	}

	.admin-section.dimmed { opacity: 0.6; }

	.admin-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.admin-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container);
		border: 2px solid transparent;
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.admin-card:hover {
		background: var(--md-sys-color-surface-container-high);
		transform: translateY(-2px);
		box-shadow: var(--md-sys-elevation-level1);
	}

	.admin-card.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
	}

	.avatar {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 48px;
		height: 48px;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.admin-card.selected .avatar {
		background: var(--md-sys-color-on-primary-container);
		color: var(--md-sys-color-primary-container);
	}

	.avatar-letter {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.admin-name {
		color: var(--md-sys-color-on-surface);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	.admin-card.selected .admin-name {
		color: var(--md-sys-color-on-primary-container);
	}

	.check-icon {
		position: absolute;
		top: var(--md-sys-spacing-sm);
		right: var(--md-sys-spacing-sm);
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-xl);
		color: var(--md-sys-color-on-surface-variant);
		text-align: center;
	}

	.empty-state .material-symbols-rounded {
		font-size: 48px;
		opacity: 0.5;
	}

	.passcode-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
		padding-top: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.passcode-input-container { width: 100%; }

	.passcode-input-container md-outlined-text-field {
		width: 100%;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-banner .material-symbols-rounded { font-size: 20px; }

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--md-sys-spacing-md);
		margin-top: var(--md-sys-spacing-sm);
	}

	.login-footer {
		display: flex;
		justify-content: center;
		padding-top: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.login-footer a { text-decoration: none; }

	@media (max-width: 480px) {
		.login-card { padding: var(--md-sys-spacing-lg); }
		.admin-grid { grid-template-columns: repeat(2, 1fr); }
	}
</style>
