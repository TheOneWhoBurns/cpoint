<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		reservation,
		loading = false,
		onEdit,
		onDelete,
		onStartRental
	}: {
		reservation: any;
		loading?: boolean;
		onEdit: (reservation: any) => void;
		onDelete: (id: number, label: string) => void;
		onStartRental: (reservation: any) => void;
	} = $props();

	const customer = $derived(reservation.customer as {name?: string, hotel?: string} | null);
	const items = $derived(reservation.items as Array<{name: string, quantity?: number, code?: string}>);
	const expired = $derived(new Date(reservation.reservedUntil) < new Date());

	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<button
	class="reservation-card"
	class:expired
	onclick={() => onEdit(reservation)}
	disabled={loading}
>
	<div class="card-header">
		<div class="customer-info">
			<div class="avatar" class:expired>
				<span class="material-symbols-rounded">event</span>
			</div>
			<div class="customer-details">
				<span class="name">{customer?.name || reservation.reason || 'Reservation'}</span>
				{#if customer?.hotel}
					<span class="meta">
						<span class="material-symbols-rounded icon-xs">hotel</span>
						{customer.hotel}
					</span>
				{/if}
				{#if reservation.reason && customer?.name}
					<span class="meta">{reservation.reason}</span>
				{/if}
			</div>
		</div>
		<span class="status-badge" class:expired>
			{expired ? 'Expired' : 'Reserved'}
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

	<div class="dates">
		<div class="date-row">
			<span class="material-symbols-rounded icon-xs">event</span>
			<span>From: {formatDate(reservation.reservedFrom)}</span>
		</div>
		<div class="date-row">
			<span class="material-symbols-rounded icon-xs">event_busy</span>
			<span>Until: {formatDate(reservation.reservedUntil)}</span>
		</div>
	</div>

	<div class="card-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span>Created {reservation.createdAt ? new Date(reservation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
		</div>
		<div class="card-actions" onclick={(e) => e.stopPropagation()}>
			<md-icon-button onclick={(e: Event) => { e.stopPropagation(); onDelete(reservation.id, customer?.name || 'Reservation'); }} disabled={loading} aria-label="Cancel reservation">
				<span class="material-symbols-rounded delete-icon">delete</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={(e: Event) => { e.stopPropagation(); onStartRental(reservation); }} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">play_arrow</span>
				Start Rental
			</md-filled-tonal-button>
		</div>
	</div>
</button>

<style>
	.reservation-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-left: 4px solid var(--md-sys-color-tertiary);
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

	.reservation-card.expired {
		opacity: 0.6;
		border-left-color: var(--md-sys-color-error);
	}

	.reservation-card:hover:not(:disabled) {
		box-shadow: var(--md-sys-elevation-level2);
		border-color: var(--md-sys-color-primary);
	}

	.reservation-card:active:not(:disabled) {
		transform: scale(0.98);
		box-shadow: none;
	}

	.reservation-card:disabled {
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
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-full);
		flex-shrink: 0;
	}

	.avatar.expired {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
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

	.status-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		flex-shrink: 0;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.status-badge.expired {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
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

	.dates {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.date-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		font: var(--md-sys-typescale-body-small);
		color: var(--md-sys-color-on-surface-variant);
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

	.delete-icon { color: var(--md-sys-color-error); }
	.icon-xs { font-size: 14px; }
	.icon-sm { font-size: 18px; }
</style>
