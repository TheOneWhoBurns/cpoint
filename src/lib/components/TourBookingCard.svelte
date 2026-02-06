<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		booking,
		loading = false,
		onEdit,
		onDelete,
		onClose
	}: {
		booking: any;
		loading?: boolean;
		onEdit: (booking: any) => void;
		onDelete: (id: number, label: string) => void;
		onClose: (booking: any) => void;
	} = $props();
</script>

<button
	class="tour-card"
	onclick={() => onEdit(booking)}
	disabled={loading}
>
	<div class="card-header">
		<div class="customer-info">
			<div class="avatar">
				<span class="material-symbols-rounded">tour</span>
			</div>
			<div class="customer-details">
				<span class="name">{booking.productName}</span>
				<span class="meta">
					<span class="material-symbols-rounded icon-xs">group</span>
					{booking.pax} pax
				</span>
			</div>
		</div>
		<span class="price-badge">${(booking.totalPrice / 100).toFixed(2)}</span>
	</div>

	<div class="tour-info">
		<div class="info-row">
			<span class="material-symbols-rounded icon-sm">calendar_today</span>
			<span>Activity: {new Date(booking.activityDate).toLocaleDateString()}</span>
		</div>
	</div>

	<div class="card-footer">
		<div class="time-info">
			<span>${(booking.unitPrice / 100).toFixed(2)}/person</span>
		</div>
		<div class="card-actions" onclick={(e) => e.stopPropagation()}>
			<md-icon-button onclick={(e: Event) => { e.stopPropagation(); onDelete(booking.id, booking.productName || 'Booking'); }} disabled={loading} aria-label="Delete booking">
				<span class="material-symbols-rounded delete-icon">delete</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={(e: Event) => { e.stopPropagation(); onClose(booking); }} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">check_circle</span>
				Close
			</md-filled-tonal-button>
		</div>
	</div>
</button>

<style>
	.tour-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-left: 4px solid var(--md-sys-color-primary);
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

	.tour-card:hover:not(:disabled) {
		box-shadow: var(--md-sys-elevation-level2);
		border-color: var(--md-sys-color-primary);
	}

	.tour-card:active:not(:disabled) {
		transform: scale(0.98);
		box-shadow: none;
	}

	.tour-card:disabled {
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

	.price-badge {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-md);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-title-medium);
		font-weight: 600;
		flex-shrink: 0;
	}

	.tour-info {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.info-row {
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
