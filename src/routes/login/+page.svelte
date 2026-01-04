<script lang="ts">
	import { goto } from '$app/navigation';
	import { shiftStore } from '$lib/stores/shift';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/text-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/list/list.js';
	import '@material/web/list/list-item.js';
	import '@material/web/icon/icon.js';

	let { data } = $props();

	let selectedOperator: typeof data.operators[0] | null = $state(null);
	let passcode = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		if (!selectedOperator) {
			error = 'Please select an operator';
			return;
		}

		if (passcode.length !== 4) {
			error = 'Passcode must be 4 digits';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/shifts/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					operatorId: selectedOperator.id,
					passcode
				})
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to start shift';
				loading = false;
				return;
			}

			const result = await response.json();
			shiftStore.login(selectedOperator, result.shift);
			goto('/');
		} catch (e) {
			error = 'Connection error';
			loading = false;
		}
	}

	function selectOperator(operator: typeof data.operators[0]) {
		selectedOperator = operator;
		error = '';
	}

	function handleBack() {
		selectedOperator = null;
		passcode = '';
	}
</script>

<div class="login-page">
	<div class="login-container">
		<header class="login-header">
			<h1>Start Shift</h1>
			<p>Select your profile and enter your passcode</p>
		</header>

		<section class="operator-selection">
			<h2>Who's working?</h2>
			<div class="operator-grid">
				{#each data.operators as operator}
					<button
						class="operator-card"
						class:selected={selectedOperator?.id === operator.id}
						onclick={() => selectOperator(operator)}
					>
						<span class="operator-avatar">{operator.name.charAt(0)}</span>
						<span class="operator-name">{operator.name}</span>
					</button>
				{/each}
				{#if data.operators.length === 0}
					<p class="no-operators">No operators configured. Add operators in admin.</p>
				{/if}
			</div>
		</section>

		{#if selectedOperator}
			<section class="passcode-section">
				<h2>Enter passcode for {selectedOperator.name}</h2>
				<md-outlined-text-field
					label="4-digit passcode"
					type="password"
					maxlength="4"
					pattern="[0-9]*"
					inputmode="numeric"
					value={passcode}
					oninput={(e: Event) => passcode = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>

				{#if error}
					<p class="error-message">{error}</p>
				{/if}

				<div class="actions">
					<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
					<md-text-button onclick={handleBack}>
						Back
					</md-text-button>
					<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
					<md-filled-button onclick={handleLogin} disabled={loading}>
						{loading ? 'Starting...' : 'Start Shift'}
					</md-filled-button>
				</div>
			</section>
		{/if}

		<a href="/" class="back-link">
			<md-text-button>Cancel</md-text-button>
		</a>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 2rem;
		background: var(--md-sys-color-surface-container-low);
	}

	.login-container {
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
		background: var(--md-sys-color-surface);
		border-radius: 1.5rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
	}

	.login-header {
		text-align: center;
	}

	.login-header h1 {
		font-size: 1.75rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	.login-header p {
		margin-top: 0.5rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.operator-selection h2,
	.passcode-section h2 {
		font-size: 1rem;
		font-weight: 500;
		margin-bottom: 1rem;
		color: var(--md-sys-color-on-surface);
	}

	.operator-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
	}

	.operator-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem 1rem;
		background: var(--md-sys-color-surface-container);
		border: 2px solid transparent;
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.operator-card:hover {
		background: var(--md-sys-color-surface-container-high);
	}

	.operator-card.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
	}

	.operator-avatar {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 3rem;
		height: 3rem;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		border-radius: 50%;
		font-size: 1.25rem;
		font-weight: 500;
	}

	.operator-card.selected .operator-avatar {
		background: var(--md-sys-color-on-primary-container);
		color: var(--md-sys-color-primary-container);
	}

	.operator-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	.no-operators {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--md-sys-color-on-surface-variant);
		padding: 2rem;
	}

	.passcode-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.passcode-section md-outlined-text-field {
		width: 100%;
	}

	.error-message {
		color: var(--md-sys-color-error);
		font-size: 0.875rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.back-link {
		display: flex;
		justify-content: center;
		text-decoration: none;
	}
</style>
