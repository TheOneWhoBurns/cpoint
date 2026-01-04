<script lang="ts">
	import { shiftStore } from '$lib/stores/shift';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/icon/icon.js';

	function handleEndShift() {
		shiftStore.logout();
	}
</script>

{#if $shiftStore.isLoggedIn}
	<div class="app-shell">
		<header class="app-header">
			<div class="header-left">
				<h1>Rental Manager</h1>
			</div>
			<div class="header-right">
				<span class="operator-badge">
					{$shiftStore.operator?.name}
				</span>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<md-outlined-button onclick={handleEndShift}>
					End Shift
				</md-outlined-button>
			</div>
		</header>

		<main class="app-main">
			<section class="inventory-panel">
				<h2>Inventory</h2>
				<div class="inventory-grid">
					<p>No items configured yet. Add product types in admin.</p>
				</div>
			</section>

			<aside class="dashboard-panel">
				<h2>Dashboard</h2>
				<div class="metrics">
					<div class="metric-card">
						<span class="metric-value">0</span>
						<span class="metric-label">Active Rentals</span>
					</div>
					<div class="metric-card">
						<span class="metric-value">$0</span>
						<span class="metric-label">Today's Revenue</span>
					</div>
				</div>

				<h3>Active Rentals</h3>
				<div class="rentals-list">
					<p>No active rentals</p>
				</div>
			</aside>
		</main>
	</div>
{:else}
	<div class="login-container">
		<div class="login-card">
			<h1>Rental Manager</h1>
			<p>Select your profile to start a shift</p>
			<a href="/login">
				<md-filled-button>Start Shift</md-filled-button>
			</a>
		</div>
	</div>
{/if}

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: var(--md-sys-color-surface-container);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	.app-header h1 {
		font-size: 1.5rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.operator-badge {
		padding: 0.5rem 1rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: 1rem;
		font-weight: 500;
	}

	.app-main {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 320px;
		overflow: hidden;
	}

	.inventory-panel {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.inventory-panel h2 {
		margin-bottom: 1rem;
		font-size: 1.25rem;
		font-weight: 500;
	}

	.dashboard-panel {
		padding: 1.5rem;
		background: var(--md-sys-color-surface-container-low);
		border-left: 1px solid var(--md-sys-color-outline-variant);
		overflow-y: auto;
	}

	.dashboard-panel h2,
	.dashboard-panel h3 {
		margin-bottom: 1rem;
		font-size: 1.125rem;
		font-weight: 500;
	}

	.dashboard-panel h3 {
		margin-top: 1.5rem;
	}

	.metrics {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		background: var(--md-sys-color-surface);
		border-radius: 0.75rem;
		border: 1px solid var(--md-sys-color-outline-variant);
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: 500;
		color: var(--md-sys-color-primary);
	}

	.metric-label {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background: var(--md-sys-color-surface-container-low);
	}

	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 3rem;
		background: var(--md-sys-color-surface);
		border-radius: 1.5rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
	}

	.login-card h1 {
		font-size: 2rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	.login-card p {
		color: var(--md-sys-color-on-surface-variant);
	}

	.login-card a {
		text-decoration: none;
	}
</style>
