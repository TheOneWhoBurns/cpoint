<script lang="ts">
	let {
		rental
	}: {
		rental: any;
	} = $props();

	const customer = $derived(rental.customer as {name?: string, hotel?: string});
	const items = $derived(rental.items as Array<{name: string, quantity?: number, code?: string}>);
	const pricing = $derived(rental.pricing as {type?: string, total?: number});
</script>

<div class="rental-card">
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
			</div>
		</div>
		{#if pricing?.total}
			<div class="price-badge">
				${Math.round(pricing.total / 100)}
			</div>
		{/if}
	</div>

	<div class="rental-items-list">
		{#each items as item}
			<span class="item-text md-body-small">
				{item.name}{item.code ? ` (${item.code})` : ''}{item.quantity ? ` x${item.quantity}` : ''}
			</span>
		{/each}
	</div>

	<div class="rental-times">
		<div class="time-row">
			<span class="material-symbols-rounded icon-xs">schedule</span>
			<span class="md-body-small">
				{new Date(rental.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
			</span>
		</div>
		{#if rental.returnedAt}
			<div class="time-row returned">
				<span class="material-symbols-rounded icon-xs">check_circle</span>
				<span class="md-body-small">
					{new Date(rental.returnedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
				</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.rental-card {
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		border-left: 4px solid var(--md-sys-color-outline);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		opacity: 0.85;
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

	.hotel-text {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.price-badge {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-title-medium);
		font-weight: 600;
		flex-shrink: 0;
	}

	.rental-items-list {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.item-text {
		color: var(--md-sys-color-on-surface-variant);
	}

	.rental-times {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.time-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.time-row.returned {
		color: var(--md-sys-color-success);
	}

	.icon-xs { font-size: 14px; }
</style>
