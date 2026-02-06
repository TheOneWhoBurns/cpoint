<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import { onMount, onDestroy } from 'svelte';

	let {
		rental,
		loading = false,
		onEdit,
		onDelete,
		onClose
	}: {
		rental: any;
		loading?: boolean;
		onEdit: (id: number) => void;
		onDelete: (id: number, label: string) => void;
		onClose: (id: number) => void;
	} = $props();

	const customer = $derived(rental.customer as {name?: string, hotel?: string});
	const items = $derived(rental.items as Array<{name: string, quantity?: number, code?: string}>);
	const pricing = $derived(rental.pricing as {type?: string});

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
		interval = setInterval(updateElapsed, 30000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<button
	class="rental-card"
	class:hourly={pricing?.type === 'hourly'}
	class:fullday={pricing?.type !== 'hourly'}
	onclick={() => onEdit(rental.id)}
	disabled={loading}
>
	<div class="card-header">
		<div class="customer-info">
			<div class="avatar">
				<span class="material-symbols-rounded">person</span>
			</div>
			<div class="customer-details">
				<span class="name">{customer?.name || 'Unknown'}</span>
				{#if customer?.hotel}
					<span class="meta">
						<span class="material-symbols-rounded icon-xs">hotel</span>
						{customer.hotel}
					</span>
				{/if}
			</div>
		</div>
		<span class="type-badge" class:hourly={pricing?.type === 'hourly'}>
			{pricing?.type === 'hourly' ? 'Hourly' : 'Full Day'}
		</span>
	</div>

	<div class="items-list">
		{#each items as item}
			<div class="item-chip">
				<span class="material-symbols-rounded icon-sm">{item.code ? 'qr_code_2' : 'inventory_2'}</span>
				<span>{item.name}{item.code ? ` (${item.code})` : ''}{item.quantity ? ` x${item.quantity}` : ''}</span>
			</div>
		{/each}
	</div>

	<div class="card-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span>{new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			<span class="elapsed-badge">{elapsedTime}</span>
		</div>
		<div class="card-actions" onclick={(e) => e.stopPropagation()}>
			<md-icon-button onclick={(e: Event) => { e.stopPropagation(); onDelete(rental.id, customer?.name || 'Rental'); }} disabled={loading} aria-label="Delete rental">
				<span class="material-symbols-rounded delete-icon">delete</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={(e: Event) => { e.stopPropagation(); onClose(rental.id); }} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">check_circle</span>
				Close
			</md-filled-tonal-button>
		</div>
	</div>
</button>

<style>
	.rental-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-large);
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
		cursor: pointer;
		width: 100%;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
			border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
			transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.rental-card.hourly { border-left: 4px solid var(--md-sys-color-tertiary); }
	.rental-card.fullday { border-left: 4px solid var(--md-sys-color-secondary); }

	.rental-card:hover:not(:disabled) {
		box-shadow: var(--md-sys-elevation-level2);
		border-color: var(--md-sys-color-primary);
	}

	.rental-card:active:not(:disabled) {
		transform: scale(0.98);
		box-shadow: none;
	}

	.rental-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.card-header {
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

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
		flex-shrink: 0;
	}

	.avatar .material-symbols-rounded { font-size: 22px; }

	.customer-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.name {
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-on-surface);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		font: var(--md-sys-typescale-body-small);
		color: var(--md-sys-color-on-surface-variant);
	}

	.type-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		flex-shrink: 0;
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.type-badge.hourly {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.items-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--md-sys-spacing-xs);
	}

	.item-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-body-small);
		color: var(--md-sys-color-on-surface);
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: var(--md-sys-spacing-sm);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.time-info {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		font: var(--md-sys-typescale-body-small);
		color: var(--md-sys-color-on-surface-variant);
	}

	.elapsed-badge {
		padding: 2px var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 600;
	}

	.delete-icon { color: var(--md-sys-color-error); }
	.icon-xs { font-size: 14px; }
	.icon-sm { font-size: 18px; }
</style>
