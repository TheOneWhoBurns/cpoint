<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		reservation,
		loading = false,
		onCancel,
		onStartRental
	}: {
		reservation: any;
		loading?: boolean;
		onCancel: (id: number) => void;
		onStartRental: (reservation: any) => void;
	} = $props();

	const customer = $derived(reservation.customer as {name?: string, hotel?: string} | null);
	const items = $derived(reservation.items as Array<{name: string, quantity?: number, code?: string}>);

	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const expired = $derived(new Date(reservation.reservedUntil) < new Date());
</script>

<div class="reservation-card" class:expired style="border-left: 4px solid {expired ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-tertiary)'};">
	<div class="rental-header">
		<div class="customer-info">
			<span class="material-symbols-rounded customer-icon">event</span>
			<div class="customer-details">
				<span class="md-title-medium">{customer?.name || reservation.reason || 'Reservation'}</span>
				{#if customer?.hotel}
					<span class="md-body-small hotel-text">
						<span class="material-symbols-rounded icon-xs">hotel</span>
						{customer.hotel}
					</span>
				{/if}
				{#if reservation.reason && customer?.name}
					<span class="md-body-small hotel-text">{reservation.reason}</span>
				{/if}
			</div>
		</div>
		<div class="status-badge" class:expired>
			{expired ? 'Expired' : 'Reserved'}
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

	<div class="reservation-dates">
		<div class="time-row">
			<span class="material-symbols-rounded icon-xs">event</span>
			<span class="md-body-small">From: {formatDate(reservation.reservedFrom)}</span>
		</div>
		<div class="time-row">
			<span class="material-symbols-rounded icon-xs">event_busy</span>
			<span class="md-body-small">Until: {formatDate(reservation.reservedUntil)}</span>
		</div>
	</div>

	<div class="rental-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span class="md-body-small">Created {reservation.createdAt ? new Date(reservation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
		</div>
		<div class="rental-actions">
			<md-icon-button onclick={() => onCancel(reservation.id)} disabled={loading} aria-label="Cancel reservation">
				<span class="material-symbols-rounded delete-icon">cancel</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={() => onStartRental(reservation)} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">play_arrow</span>
				Start Rental
			</md-filled-tonal-button>
		</div>
	</div>
</div>

<style>
	.reservation-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.reservation-card:hover {
		box-shadow: var(--md-sys-elevation-level2);
	}

	.reservation-card.expired {
		opacity: 0.6;
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
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
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

	.status-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		flex-shrink: 0;
	}

	.status-badge.expired {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
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

	.reservation-dates {
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

	.delete-icon { color: var(--md-sys-color-error); }
	.icon-xs { font-size: 14px; }
	.icon-sm { font-size: 18px; }
</style>
