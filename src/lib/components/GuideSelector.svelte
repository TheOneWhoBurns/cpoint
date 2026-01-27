<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';

	interface Guide {
		id: number;
		name: string;
		inCooldown?: boolean;
		minutesRemaining?: number;
	}

	let {
		guides = [],
		selectedGuideId = $bindable<number | null>(null),
		loading = false,
		onVerifyPin = async (guideId: number, pin: string) => {}
	} = $props();

	let showPinOverride = $state(false);
	let pendingGuideId = $state<number | null>(null);
	let pinInput = $state('');
	let pinError = $state('');

	function handleGuideSelect(guideId: number) {
		const guide = guides.find(g => g.id === guideId);
		if (guide?.inCooldown) {
			pendingGuideId = guideId;
			showPinOverride = true;
			pinInput = '';
			pinError = '';
		} else {
			selectedGuideId = guideId;
		}
	}

	async function handlePinSubmit() {
		if (!pendingGuideId) return;

		if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
			pinError = 'PIN must be 4 digits';
			return;
		}

		const verified = await onVerifyPin(pendingGuideId, pinInput);
		if (verified) {
			selectedGuideId = pendingGuideId;
			showPinOverride = false;
			pendingGuideId = null;
			pinInput = '';
			pinError = '';
		} else {
			pinError = 'Invalid PIN';
			pinInput = '';
		}
	}

	function handleCancel() {
		showPinOverride = false;
		pendingGuideId = null;
		pinInput = '';
		pinError = '';
	}

	const selectedGuide = $derived(guides.find(g => g.id === selectedGuideId));
	const pendingGuide = $derived(guides.find(g => g.id === pendingGuideId));
</script>

<div class="guide-selector">
	<div class="selector-header">
		<span class="material-symbols-rounded">hiking</span>
		<span class="md-title-small">Assign Guide</span>
		<span class="md-body-small optional">(optional)</span>
	</div>

	{#if selectedGuide}
		<div class="selected-guide">
			<div class="guide-avatar">
				<span class="material-symbols-rounded">hiking</span>
			</div>
			<div class="guide-info">
				<span class="md-title-medium">{selectedGuide.name}</span>
				<span class="status-badge assigned">
					<span class="material-symbols-rounded icon-xs">check_circle</span>
					Assigned
				</span>
			</div>
			<md-icon-button onclick={() => (selectedGuideId = null)} disabled={loading} aria-label="Deselect guide">
				<span class="material-symbols-rounded">close</span>
			</md-icon-button>
		</div>
	{:else}
		<div class="guide-list">
			{#each guides as guide}
				<button
					class="guide-button"
					class:in-cooldown={guide.inCooldown}
					onclick={() => handleGuideSelect(guide.id)}
					disabled={loading}
				>
					<div class="guide-avatar small">
						<span class="material-symbols-rounded">hiking</span>
					</div>
					<span class="md-body-medium">{guide.name}</span>
					{#if guide.inCooldown}
						<div class="cooldown-badge">
							<span class="material-symbols-rounded icon-xs">timer</span>
							<span class="md-label-small">{guide.minutesRemaining}min</span>
						</div>
					{/if}
				</button>
			{/each}
			{#if guides.length === 0}
				<div class="empty-state">
					<span class="material-symbols-rounded">person_off</span>
					<span class="md-body-small">No guides available</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if showPinOverride && pendingGuideId && pendingGuide}
		<div class="pin-override-card">
			<div class="override-header">
				<span class="material-symbols-rounded warning-icon">warning</span>
				<div class="override-info">
					<span class="md-body-medium">{pendingGuide.name} is on cooldown</span>
					<span class="md-body-small">Enter PIN to override</span>
				</div>
			</div>

			<md-outlined-text-field
				label="Guide PIN"
				type="password"
				maxlength="4"
				pattern="[0-9]*"
				inputmode="numeric"
				value={pinInput}
				oninput={(e: Event) => pinInput = (e.target as HTMLInputElement).value}
				disabled={loading}
				error={!!pinError}
				supporting-text={pinError || ''}
			>
				<span class="material-symbols-rounded" slot="leading-icon">lock</span>
			</md-outlined-text-field>

			<div class="override-actions">
				<md-outlined-button onclick={handleCancel} disabled={loading}>
					Cancel
				</md-outlined-button>
				<md-filled-button onclick={handlePinSubmit} disabled={loading || pinInput.length !== 4}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Verify
				</md-filled-button>
			</div>
		</div>
	{/if}
</div>

<style>
	.guide-selector {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.selector-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface);
	}

	.selector-header .material-symbols-rounded {
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.optional {
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Selected Guide */
	.selected-guide {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-primary-container);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.guide-avatar {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.guide-avatar.small {
		width: 32px;
		height: 32px;
	}

	.guide-avatar .material-symbols-rounded {
		font-size: 20px;
	}

	.guide-avatar.small .material-symbols-rounded {
		font-size: 16px;
	}

	.guide-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.guide-info .md-title-medium {
		color: var(--md-sys-color-on-primary-container);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
	}

	.status-badge.assigned {
		color: var(--md-sys-color-on-primary-container);
		font: var(--md-sys-typescale-label-small);
	}

	/* Guide List */
	.guide-list {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.guide-button {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		color: var(--md-sys-color-on-surface);
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.guide-button:hover:not(:disabled) {
		background: var(--md-sys-color-surface-container);
		border-color: var(--md-sys-color-outline);
	}

	.guide-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.guide-button.in-cooldown {
		background: var(--md-sys-color-warning-container);
		border-color: var(--md-sys-color-warning);
	}

	.guide-button.in-cooldown .guide-avatar {
		background: var(--md-sys-color-warning);
		color: var(--md-sys-color-on-warning);
	}

	.cooldown-badge {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	/* Empty State */
	.empty-state {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty-state .material-symbols-rounded {
		font-size: 24px;
		opacity: 0.5;
	}

	/* PIN Override Card */
	.pin-override-card {
		margin-top: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-warning-container);
		border-radius: var(--md-sys-shape-corner-medium);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.override-header {
		display: flex;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
	}

	.warning-icon {
		font-size: 24px;
		color: var(--md-sys-color-on-warning-container);
	}

	.override-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: var(--md-sys-color-on-warning-container);
	}

	.pin-override-card md-outlined-text-field {
		width: 100%;
		--md-outlined-text-field-container-shape: var(--md-sys-shape-corner-small);
	}

	.override-actions {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		justify-content: flex-end;
	}

	/* Icon Sizes */
	.icon-xs {
		font-size: 14px;
	}
</style>
