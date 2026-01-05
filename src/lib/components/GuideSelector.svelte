<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';

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
</script>

<div class="guide-selector">
	<label>Assign Guide (optional)</label>

	{#if selectedGuide}
		<div class="selected-guide">
			<span>{selectedGuide.name}</span>
			<button onclick={() => (selectedGuideId = null)} disabled={loading}>Clear</button>
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
					<span>{guide.name}</span>
					{#if guide.inCooldown}
						<span class="cooldown-badge">{guide.minutesRemaining}min</span>
					{/if}
				</button>
			{/each}
			{#if guides.length === 0}
				<p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.875rem;">
					No guides available
				</p>
			{/if}
		</div>
	{/if}

	{#if showPinOverride && pendingGuideId}
		<div class="pin-override">
			<p style="font-size: 0.875rem; color: var(--md-sys-color-warning, #f5a623); margin: 0.5rem 0 1rem 0;">
				This guide is on cooldown. Enter PIN to override.
			</p>
			<md-outlined-text-field
				label="Guide PIN"
				type="password"
				maxlength="4"
				pattern="[0-9]*"
				inputmode="numeric"
				value={pinInput}
				oninput={(e: Event) => pinInput = (e.target as HTMLInputElement).value}
				disabled={loading}
			></md-outlined-text-field>
			{#if pinError}
				<p style="color: var(--md-sys-color-error); font-size: 0.875rem; margin-top: 0.5rem;">
					{pinError}
				</p>
			{/if}
			<div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
				<md-outlined-button onclick={handleCancel} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handlePinSubmit} disabled={loading || pinInput.length !== 4}>
					Verify
				</md-filled-button>
			</div>
		</div>
	{/if}
</div>

<style>
	.guide-selector {
		margin-bottom: 1.5rem;
	}
	.guide-selector label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface);
	}
	.selected-guide {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: 0.5rem;
	}
	.guide-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.guide-button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--md-sys-color-surface-container);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface);
		transition: all 0.2s;
	}
	.guide-button:hover:not(:disabled) {
		background: var(--md-sys-color-surface-container-high);
	}
	.guide-button.in-cooldown {
		opacity: 0.7;
		background: var(--md-sys-color-tertiary-container, #fce4ec);
	}
	.cooldown-badge {
		font-size: 0.75rem;
		background: var(--md-sys-color-error);
		color: var(--md-sys-color-on-error);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}
	.pin-override {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--md-sys-color-surface-container-low);
		border-radius: 0.5rem;
	}
</style>
