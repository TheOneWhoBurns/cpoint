<script lang="ts">
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		booking,
		loading = false,
		onDelete,
		onClose
	}: {
		booking: any;
		loading?: boolean;
		onDelete: (id: number) => void;
		onClose: (booking: any) => void;
	} = $props();
</script>

<div class="tour-card" style="border-left: 4px solid var(--md-sys-color-primary);">
	<div class="rental-header">
		<div class="customer-info">
			<span class="material-symbols-rounded customer-icon">tour</span>
			<div class="customer-details">
				<span class="md-title-medium">{booking.productName}</span>
				<span class="md-body-small hotel-text">
					<span class="material-symbols-rounded icon-xs">group</span>
					{booking.pax} pax
				</span>
			</div>
		</div>
		<div class="price-badge">
			${(booking.totalPrice / 100).toFixed(2)}
		</div>
	</div>

	<div class="tour-dates">
		<div class="tour-date-row">
			<span class="material-symbols-rounded icon-sm">event</span>
			<span class="md-body-small">Booked: {new Date(booking.bookedAt).toLocaleDateString()}</span>
		</div>
		<div class="tour-date-row">
			<span class="material-symbols-rounded icon-sm">calendar_today</span>
			<span class="md-body-small">Activity: {new Date(booking.activityDate).toLocaleDateString()}</span>
		</div>
	</div>

	<div class="tour-pricing-row">
		<span class="md-body-small">Price/person: ${(booking.unitPrice / 100).toFixed(2)}</span>
	</div>

	<div class="rental-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span class="md-body-small">Created {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
		</div>
		<div class="rental-actions">
			<md-icon-button onclick={() => onDelete(booking.id)} disabled={loading} aria-label="Delete booking">
				<span class="material-symbols-rounded delete-icon">delete</span>
			</md-icon-button>
			<md-filled-tonal-button onclick={() => onClose(booking)} disabled={loading}>
				<span class="material-symbols-rounded" slot="icon">check_circle</span>
				Close
			</md-filled-tonal-button>
		</div>
	</div>
</div>

<style>
	.tour-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.tour-card:hover {
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

	.price-badge {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-title-medium);
		font-weight: 600;
		flex-shrink: 0;
	}

	.tour-dates {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.tour-date-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.tour-pricing-row {
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
