<script lang="ts">
	import { goto } from '$app/navigation';
	import { shiftStore } from '$lib/stores/shift';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/text-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/progress/circular-progress.js';

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
			shiftStore.setSession(result.operator, result.shift);
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
		error = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && selectedOperator && passcode.length === 4) {
			handleLogin();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="login-page">
	<div class="login-card md-animate-scale-in">
		<!-- Header -->
		<header class="login-header">
			<div class="logo-container">
				<span class="material-symbols-rounded filled logo-icon">storefront</span>
			</div>
			<h1 class="md-headline-medium">Start Your Shift</h1>
			<p class="md-body-medium subtitle">Select your profile and enter your passcode to begin</p>
		</header>

		<!-- Operator Selection -->
		<section class="operator-section" class:dimmed={selectedOperator !== null}>
			<div class="section-header">
				<span class="material-symbols-rounded">person</span>
				<h2 class="md-title-medium">Who's working today?</h2>
			</div>

			{#if data.operators.length === 0}
				<div class="empty-state">
					<span class="material-symbols-rounded icon-lg">person_off</span>
					<p class="md-body-medium">No operators configured</p>
					<a href="/admin/operators" class="md-body-small">Add operators in admin panel</a>
				</div>
			{:else}
				<div class="operator-grid">
					{#each data.operators as operator}
						<button
							class="operator-card"
							class:selected={selectedOperator?.id === operator.id}
							onclick={() => selectOperator(operator)}
							aria-label="Select operator {operator.name}"
						>
							<div class="avatar">
								<span class="avatar-letter">{operator.name.charAt(0).toUpperCase()}</span>
							</div>
							<span class="operator-name md-label-large">{operator.name}</span>
							{#if selectedOperator?.id === operator.id}
								<span class="material-symbols-rounded filled check-icon">check_circle</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Passcode Entry -->
		{#if selectedOperator}
			<section class="passcode-section md-animate-slide-up">
				<div class="section-header">
					<span class="material-symbols-rounded">pin</span>
					<h2 class="md-title-medium">Enter passcode for {selectedOperator.name}</h2>
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
						supporting-text="Enter your personal 4-digit code"
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
					<md-outlined-button onclick={handleBack} disabled={loading}>
						<span class="material-symbols-rounded" slot="icon">arrow_back</span>
						Back
					</md-outlined-button>
					<md-filled-button onclick={handleLogin} disabled={loading || passcode.length !== 4}>
						{#if loading}
							<md-circular-progress indeterminate aria-label="Loading"></md-circular-progress>
						{:else}
							<span class="material-symbols-rounded" slot="icon">login</span>
							Start Shift
						{/if}
					</md-filled-button>
				</div>
			</section>
		{/if}

		<!-- Footer -->
		<footer class="login-footer">
			<a href="/" class="cancel-link">
				<md-text-button>
					<span class="material-symbols-rounded" slot="icon">close</span>
					Cancel
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
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xl);
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		box-shadow: var(--md-sys-elevation-level3);
	}

	/* Header */
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

	/* Section Header */
	.section-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-md);
		color: var(--md-sys-color-on-surface);
	}

	.section-header h2 {
		margin: 0;
	}

	.section-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
	}

	/* Operator Section */
	.operator-section {
		transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
	}

	.operator-section.dimmed {
		opacity: 0.6;
	}

	.operator-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.operator-card {
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

	.operator-card:hover {
		background: var(--md-sys-color-surface-container-high);
		transform: translateY(-2px);
		box-shadow: var(--md-sys-elevation-level1);
	}

	.operator-card:active {
		transform: translateY(0);
	}

	.operator-card.selected {
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
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.operator-card.selected .avatar {
		background: var(--md-sys-color-on-primary-container);
		color: var(--md-sys-color-primary-container);
	}

	.avatar-letter {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.operator-name {
		color: var(--md-sys-color-on-surface);
		text-align: center;
	}

	.operator-card.selected .operator-name {
		color: var(--md-sys-color-on-primary-container);
	}

	.check-icon {
		position: absolute;
		top: 8px;
		right: 8px;
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	/* Empty State */
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

	.empty-state a {
		color: var(--md-sys-color-primary);
		text-decoration: none;
	}

	.empty-state a:hover {
		text-decoration: underline;
	}

	/* Passcode Section */
	.passcode-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
		padding-top: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.passcode-input-container {
		width: 100%;
	}

	.passcode-input-container md-outlined-text-field {
		width: 100%;
		--md-outlined-text-field-container-shape: var(--md-sys-shape-corner-small);
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-banner .material-symbols-rounded {
		font-size: 20px;
	}

	/* Actions */
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--md-sys-spacing-sm);
		margin-top: var(--md-sys-spacing-sm);
	}

	.actions md-filled-button {
		--md-filled-button-container-color: var(--md-sys-color-primary);
		--md-filled-button-label-text-color: var(--md-sys-color-on-primary);
	}

	.actions md-outlined-button {
		--md-outlined-button-outline-color: var(--md-sys-color-outline);
	}

	.actions md-circular-progress {
		--md-circular-progress-size: 20px;
		--md-circular-progress-active-indicator-color: var(--md-sys-color-on-primary);
	}

	/* Footer */
	.login-footer {
		display: flex;
		justify-content: center;
		padding-top: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.cancel-link {
		text-decoration: none;
	}

	/* Responsive */
	@media (max-width: 480px) {
		.login-card {
			padding: var(--md-sys-spacing-lg);
		}

		.operator-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
