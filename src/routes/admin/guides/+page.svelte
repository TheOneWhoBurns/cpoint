<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let guideName = $state('');
	let guidePasscode = $state('');
	let guideCooldown = $state('30');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteGuide = $state(false);
	let pendingDeleteGuideId = $state<number | null>(null);

	async function createGuide() {
		if (!guideName.trim()) {
			error = 'Guide name required';
			return;
		}

		if (!guidePasscode || guidePasscode.length !== 4 || !/^\d{4}$/.test(guidePasscode)) {
			error = 'Passcode must be 4 digits';
			return;
		}

		const cooldown = parseInt(guideCooldown) || 30;
		if (cooldown < 0) {
			error = 'Cooldown must be positive';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: guideName,
				passcode: guidePasscode,
				cooldownMinutes: cooldown
			})
		});

		if (res.ok) {
			guideName = '';
			guidePasscode = '';
			guideCooldown = '30';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create guide';
		}
		loading = false;
	}

	async function updateCooldown(id: number, newCooldown: number) {
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, cooldownMinutes: newCooldown })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	async function toggleActive(id: number, isActive: boolean) {
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	function promptDeleteGuide(id: number) {
		pendingDeleteGuideId = id;
		confirmDeleteGuide = true;
	}

	async function executeDeleteGuide() {
		if (!pendingDeleteGuideId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteGuideId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteGuideId = null;
	}

	function formatLastRental(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="guides-page">
	<!-- Add Guide Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">person_add</span>
			<h2 class="md-title-large">Add Guide</h2>
		</div>
		<div class="card-content">
			<div class="form-grid">
				<md-outlined-text-field
					label="Guide Name"
					placeholder="Enter guide name"
					value={guideName}
					oninput={(e: Event) => guideName = (e.target as HTMLInputElement).value}
					disabled={loading}
				>
					<span class="material-symbols-rounded" slot="leading-icon">hiking</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="4-Digit PIN"
					type="password"
					maxlength="4"
					pattern="[0-9]*"
					inputmode="numeric"
					placeholder="4 digits"
					value={guidePasscode}
					oninput={(e: Event) => guidePasscode = (e.target as HTMLInputElement).value}
					disabled={loading}
					supporting-text="Used to override cooldown"
				>
					<span class="material-symbols-rounded" slot="leading-icon">lock</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Cooldown (minutes)"
					type="number"
					min="0"
					value={guideCooldown}
					oninput={(e: Event) => guideCooldown = (e.target as HTMLInputElement).value}
					disabled={loading}
					supporting-text="Rest period after rental ends"
				>
					<span class="material-symbols-rounded" slot="leading-icon">timer</span>
				</md-outlined-text-field>
			</div>

			{#if error}
				<div class="error-message">
					<span class="material-symbols-rounded">error</span>
					<span class="md-body-medium">{error}</span>
				</div>
			{/if}

			<div class="form-actions">
				<md-filled-button onclick={createGuide} disabled={loading || !guideName || guidePasscode.length !== 4}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					Add Guide
				</md-filled-button>
			</div>
		</div>
	</section>

	<!-- Guides List -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">groups</span>
			<h2 class="md-title-large">All Guides</h2>
			<span class="badge md-label-medium">{data.guides.length}</span>
		</div>

		{#if data.guides.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">person_off</span>
				<p class="md-body-medium">No guides added yet</p>
				<p class="md-body-small">Add your first guide above</p>
			</div>
		{:else}
			<div class="guides-list">
				{#each data.guides as guide}
					<div class="guide-card" class:inactive={!guide.isActive} class:in-cooldown={guide.inCooldown}>
						<div class="guide-avatar">
							<span class="material-symbols-rounded">hiking</span>
						</div>

						<div class="guide-info">
							<span class="md-title-medium">{guide.name}</span>
							<div class="guide-meta">
								<span class="status-badge" class:active={guide.isActive} class:inactive={!guide.isActive}>
									{guide.isActive ? 'Active' : 'Inactive'}
								</span>
								{#if guide.inCooldown}
									<span class="cooldown-badge">
										<span class="material-symbols-rounded icon-sm">timer</span>
										{guide.minutesRemaining}min remaining
									</span>
								{/if}
							</div>
						</div>

						<div class="guide-details">
							<div class="detail-item">
								<span class="md-label-small">Cooldown</span>
								<div class="cooldown-control">
									<input
										type="number"
										min="0"
										value={guide.cooldownMinutes}
										onchange={(e: Event) => updateCooldown(guide.id, parseInt((e.target as HTMLInputElement).value) || 0)}
										disabled={loading}
										class="cooldown-input"
									/>
									<span class="md-body-small">min</span>
								</div>
							</div>
							<div class="detail-item">
								<span class="md-label-small">Last Rental</span>
								<span class="md-body-small">{formatLastRental(guide.lastRentalEnd)}</span>
							</div>
						</div>

						<div class="guide-actions">
							<label class="switch-label">
								<md-switch
									selected={guide.isActive}
									onchange={() => toggleActive(guide.id, guide.isActive)}
									disabled={loading}
									aria-label="Toggle guide status"
								></md-switch>
							</label>
							<md-icon-button onclick={() => promptDeleteGuide(guide.id)} disabled={loading} aria-label="Delete guide">
								<span class="material-symbols-rounded">delete</span>
							</md-icon-button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<ConfirmModal
	bind:open={confirmDeleteGuide}
	title="Delete Guide"
	message="Are you sure you want to delete this guide? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteGuide}
/>

<style>
	.guides-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 900px;
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

	/* Guides List */
	.guides-list {
		display: flex;
		flex-direction: column;
	}

	.guide-card {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.guide-card:last-child {
		border-bottom: none;
	}

	.guide-card:hover {
		background: var(--md-sys-color-surface-container);
	}

	.guide-card.inactive {
		opacity: 0.7;
	}

	.guide-card.in-cooldown {
		background: var(--md-sys-color-warning-container);
	}

	.guide-card.in-cooldown:hover {
		background: var(--md-sys-color-warning-container);
	}

	.guide-avatar {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 48px;
		height: 48px;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-full);
		flex-shrink: 0;
	}

	.guide-card.inactive .guide-avatar {
		background: var(--md-sys-color-surface-container-highest);
		color: var(--md-sys-color-on-surface-variant);
	}

	.guide-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
		min-width: 0;
	}

	.guide-info .md-title-medium {
		color: var(--md-sys-color-on-surface);
	}

	.guide-meta {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		flex-wrap: wrap;
	}

	/* Status Badges */
	.status-badge {
		display: inline-block;
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

	.cooldown-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 10px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-small);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.icon-sm {
		font-size: 14px;
	}

	/* Guide Details */
	.guide-details {
		display: flex;
		gap: var(--md-sys-spacing-lg);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.detail-item .md-label-small {
		color: var(--md-sys-color-on-surface-variant);
	}

	.cooldown-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.cooldown-input {
		width: 60px;
		padding: 4px 8px;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font-size: 0.875rem;
		text-align: center;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	/* Guide Actions */
	.guide-actions {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	md-icon-button {
		--md-icon-button-icon-color: var(--md-sys-color-error);
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
	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.guide-card {
			flex-wrap: wrap;
		}

		.guide-details {
			width: 100%;
			justify-content: space-between;
			margin-top: var(--md-sys-spacing-sm);
		}

		.guide-actions {
			width: 100%;
			justify-content: flex-end;
			margin-top: var(--md-sys-spacing-sm);
		}
	}
</style>
