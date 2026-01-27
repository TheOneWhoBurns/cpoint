<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';

	let { data } = $props();

	let name = $state('');
	let passcode = $state('');
	let loading = $state(false);
	let error = $state('');

	async function createOperator() {
		if (!name || passcode.length !== 4) {
			error = 'Name required, passcode must be 4 digits';
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/operators', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, passcode })
			});
			if (res.ok) {
				name = '';
				passcode = '';
				await invalidateAll();
			} else {
				const d = await res.json();
				error = d.error || 'Failed';
			}
		} catch {
			error = 'Network error';
		}
		loading = false;
	}

	async function toggleOperator(id: string, isActive: boolean) {
		loading = true;
		try {
			const res = await fetch('/api/operators', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, isActive: !isActive })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				const d = await res.json();
				error = d.error || 'Failed to update operator';
			}
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<div class="operators-page">
	<!-- Add Operator Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">person_add</span>
			<h2 class="md-title-large">Add Operator</h2>
		</div>
		<div class="card-content">
			<div class="form-grid">
				<md-outlined-text-field
					label="Name"
					placeholder="Enter operator name"
					value={name}
					oninput={(e: Event) => name = (e.target as HTMLInputElement).value}
				>
					<span class="material-symbols-rounded" slot="leading-icon">badge</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Passcode"
					type="password"
					maxlength="4"
					pattern="[0-9]*"
					inputmode="numeric"
					placeholder="4 digits"
					value={passcode}
					oninput={(e: Event) => passcode = (e.target as HTMLInputElement).value}
					supporting-text="Enter a 4-digit passcode"
				>
					<span class="material-symbols-rounded" slot="leading-icon">lock</span>
				</md-outlined-text-field>
			</div>

			{#if error}
				<div class="error-message">
					<span class="material-symbols-rounded">error</span>
					<span class="md-body-medium">{error}</span>
				</div>
			{/if}

			<div class="form-actions">
				<md-filled-button onclick={createOperator} disabled={loading || !name || passcode.length !== 4}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					Add Operator
				</md-filled-button>
			</div>
		</div>
	</section>

	<!-- Operators List -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">group</span>
			<h2 class="md-title-large">All Operators</h2>
			<span class="badge md-label-medium">{data.operators.length}</span>
		</div>

		{#if data.operators.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">person_off</span>
				<p class="md-body-medium">No operators yet</p>
				<p class="md-body-small">Add your first operator above</p>
			</div>
		{:else}
			<div class="operators-grid">
				{#each data.operators as op}
					<div class="operator-card" class:inactive={!op.isActive}>
						<div class="operator-avatar">
							<span class="avatar-letter">{op.name.charAt(0).toUpperCase()}</span>
						</div>
						<div class="operator-info">
							<span class="md-title-medium">{op.name}</span>
							<span class="status-badge" class:active={op.isActive} class:inactive={!op.isActive}>
								{op.isActive ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div class="operator-actions">
							<label class="switch-label">
								<span class="md-body-small">{op.isActive ? 'Active' : 'Inactive'}</span>
								<md-switch
									selected={op.isActive}
									onchange={() => toggleOperator(op.id, op.isActive)}
									aria-label="Toggle operator status"
								></md-switch>
							</label>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.operators-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 800px;
	}

	/* Card Styles */
	.card {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-large);
		border: 1px solid var(--md-sys-color-outline-variant);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface-container-low);
	}

	.card-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
		font-size: 24px;
	}

	.card-header h2 {
		flex: 1;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.card-content {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	/* Badge */
	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Form Styles */
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.form-grid md-outlined-text-field {
		width: 100%;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--md-sys-spacing-sm);
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-message .material-symbols-rounded {
		font-size: 20px;
	}

	/* Operators Grid */
	.operators-grid {
		display: flex;
		flex-direction: column;
	}

	.operator-card {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.operator-card:last-child {
		border-bottom: none;
	}

	.operator-card:hover {
		background: var(--md-sys-color-surface-container);
	}

	.operator-card.inactive {
		opacity: 0.7;
	}

	.operator-avatar {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 48px;
		height: 48px;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		border-radius: var(--md-sys-shape-corner-full);
		flex-shrink: 0;
	}

	.operator-card.inactive .operator-avatar {
		background: var(--md-sys-color-surface-container-highest);
		color: var(--md-sys-color-on-surface-variant);
	}

	.avatar-letter {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.operator-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.operator-info .md-title-medium {
		color: var(--md-sys-color-on-surface);
	}

	/* Status Badge */
	.status-badge {
		display: inline-block;
		width: fit-content;
		padding: 2px 10px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-small);
	}

	.status-badge.active {
		background: var(--md-sys-color-success-container);
		color: var(--md-sys-color-on-success-container);
	}

	.status-badge.inactive {
		background: var(--md-sys-color-surface-container-highest);
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Switch Label */
	.switch-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		cursor: pointer;
	}

	.switch-label .md-body-small {
		color: var(--md-sys-color-on-surface-variant);
		min-width: 50px;
		text-align: right;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-xxl);
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty-state .material-symbols-rounded {
		font-size: 48px;
		opacity: 0.5;
	}

	/* Responsive */
	@media (max-width: 480px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.operator-card {
			flex-wrap: wrap;
		}

		.operator-actions {
			width: 100%;
			justify-content: flex-end;
			margin-top: var(--md-sys-spacing-sm);
		}
	}
</style>
