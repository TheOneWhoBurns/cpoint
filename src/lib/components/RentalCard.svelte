<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import { onMount, onDestroy } from 'svelte';

	let {
		rental,
		loading = false,
		onEdit,
		onClose
	}: {
		rental: any;
		loading?: boolean;
		onEdit: (id: number) => void;
		onClose: (id: number) => void;
	} = $props();

	const customer = $derived(rental.customer as {name?: string, hotel?: string});
	const items = $derived(rental.items as Array<{name: string, quantity?: number, code?: string}>);
	const pricing = $derived(rental.pricing as {type?: string});
	const guideName = $derived(rental.guideName as string | null);

	let elapsedTime = $state('');
	let interval: ReturnType<typeof setInterval> | null = null;

	function updateElapsed() {
		const start = new Date(rental.startedAt);
		const now = new Date();
		const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
		const hours = Math.floor(diff / 60);
		const mins = diff % 60;
		elapsedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	}

	onMount(() => {
		updateElapsed();
		interval = setInterval(updateElapsed, 60000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	const accentColor = $derived(pricing?.type === 'hourly' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-secondary)');
</script>

<div class="rental-card" style="border-left: 4px solid {accentColor};">
	<div class="rental-header">
		<div class="customer-info">
			<span class="material-symbols-rounded customer-icon">person</span>
			<div class="customer-details">
				<span class="md-title-medium">{customer?.name || 'Unknown'}</span>
				{#if customer?.hotel}
					<span class="md-body-small hotel-text">
						<span class="material-symbols-rounded icon-xs">hotel</span>
						{customer.hotel}
					</span>
				{/if}
				{#if guideName}
					<span class="md-body-small guide-text">
						<span class="material-symbols-rounded icon-xs">hiking</span>
						{guideName}
					</span>
				{/if}
			</div>
		</div>
		<div class="rental-type-badge" class:hourly={pricing?.type === 'hourly'} class:fullday={pricing?.type !== 'hourly'}>
			{pricing?.type === 'hourly' ? 'Hourly' : 'Full Day'}
		</div>
	</div>

	<div class="rental-items-list">
		{#each items as item}
			<div class="item-chip">
				<span class="material-symbols-rounded icon-sm">
					{item.code ? 'qr_code_2' : 'inventory_2'}
				</span>
				<span class="md-body-small">
					{item.name}{item.code ? ` (${item.code})` : ''}{item.quantity ? ` x${item.quantity}` : ''}
				</span>
			</div>
		{/each}
	</div>

	<div class="rental-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span class="md-body-small">Started {new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			<span class="elapsed-badge">{elapsedTime}</span>
		</div>
		<div class="rental-actions">
			<md-icon-button onclick={() => onEdit(rental.id)} disabled={loading} aria-label="Edit rental">
				<span class="material-symbols-rounded">edit</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={() => onClose(rental.id)} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">check_circle</span>
				Close Rental
			</md-filled-tonal-button>
		</div>
	</div>
</div>

<style>
	.rental-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.rental-card:hover {
		box-shadow: var(--md-sys-elevation-level2);
	}

	.rental-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
	}

	.customer-info {
		display: flex;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
	}

	.customer-icon {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
		padding: var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.customer-details {
		display: flex;
		flex-direction: column;
	}

	.customer-details .md-title-medium {
		color: var(--md-sys-color-on-surface);
	}

	.hotel-text, .guide-text {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.rental-type-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		flex-shrink: 0;
	}

	.rental-type-badge.hourly {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.rental-type-badge.fullday {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.rental-items-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--md-sys-spacing-xs);
	}

	.item-chip {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-small);
		color: var(--md-sys-color-on-surface);
	}

	.rental-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: var(--md-sys-spacing-sm);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.rental-actions {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.time-info {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.elapsed-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 500;
	}

	.icon-xs { font-size: 14px; }
	.icon-sm { font-size: 18px; }
</style>
