<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		open = $bindable(false),
		booking = null as any,
		loading = $bindable(false),
		onSubmit
	}: {
		open: boolean;
		booking: any;
		loading?: boolean;
		onSubmit: (id: number, cost: number) => Promise<void>;
	} = $props();

	let tourCloseCost = $state('');
	let tourCloseError = $state('');

	function close() {
		open = false;
		tourCloseCost = '';
		tourCloseError = '';
	}

	async function handleSubmit() {
		if (!booking) return;
		const cost = parseFloat(tourCloseCost);
		if (isNaN(cost) || cost < 0) { tourCloseError = 'Enter a valid cost'; return; }
		tourCloseError = '';
		try {
			await onSubmit(booking.id, cost);
			close();
		} catch (e: any) {
			tourCloseError = e.message || 'Failed to close booking';
		}
	}
</script>

{#if open && booking}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">check_circle</span>
					<h2 class="md-headline-small">Close Tour Booking</h2>
				</div>
				<md-icon-button onclick={close}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="summary-section">
					<div class="summary-header">
						<span class="material-symbols-rounded">tour</span>
						<span class="md-title-medium">{booking.productName}</span>
					</div>
					<div class="summary-row">
						<span class="md-body-medium">Pax</span>
						<span class="md-title-medium">{booking.pax}</span>
					</div>
					<div class="summary-row">
						<span class="md-body-medium">Revenue (price x pax)</span>
						<span class="md-title-medium">${(booking.totalPrice / 100).toFixed(2)}</span>
					</div>
					<div class="summary-row">
						<span class="md-body-medium">Activity Date</span>
						<span class="md-title-medium">{new Date(booking.activityDate).toLocaleDateString()}</span>
					</div>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">payments</span>
						<span class="md-title-small">Cost (variable)</span>
					</label>
					<md-outlined-text-field
						label="Cost"
						type="number"
						step="0.01"
						min="0"
						placeholder="Enter actual cost..."
						value={tourCloseCost}
						oninput={(e: Event) => tourCloseCost = (e.target as HTMLInputElement).value}
						disabled={loading}
						prefix-text="$"
						supporting-text="The variable cost for this tour (not multiplied by pax)"
					>
						<span class="material-symbols-rounded" slot="leading-icon">payments</span>
					</md-outlined-text-field>
				</div>
				{#if tourCloseCost && parseFloat(tourCloseCost) >= 0}
					<div class="summary-section">
						<div class="summary-row">
							<span class="md-body-medium">Revenue</span>
							<span class="md-title-medium">${(booking.totalPrice / 100).toFixed(2)}</span>
						</div>
						<div class="summary-row">
							<span class="md-body-medium">Cost</span>
							<span class="md-title-medium">-${parseFloat(tourCloseCost).toFixed(2)}</span>
						</div>
						<div class="summary-row total">
							<span class="md-body-medium">Profit</span>
							<span class="md-headline-small">${((booking.totalPrice / 100) - parseFloat(tourCloseCost)).toFixed(2)}</span>
						</div>
					</div>
				{/if}
				{#if tourCloseError}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{tourCloseError}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSubmit} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">check_circle</span>
					Close Booking
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title .material-symbols-rounded { font-size: 32px; color: var(--md-sys-color-primary); }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.form-section { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.form-label { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-title-small); }
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); }
	.summary-section { background: var(--md-sys-color-surface-container-low); border-radius: var(--md-sys-shape-corner-medium); padding: var(--md-sys-spacing-md); }
	.summary-header { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); margin-bottom: var(--md-sys-spacing-md); padding-bottom: var(--md-sys-spacing-md); border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.summary-header .material-symbols-rounded { font-size: 28px; color: var(--md-sys-color-primary); }
	.summary-row { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-sm) 0; }
	.summary-row .md-body-medium { color: var(--md-sys-color-on-surface-variant); }
	.summary-row .md-title-medium { color: var(--md-sys-color-primary); }
	.summary-row.total .md-headline-small { color: var(--md-sys-color-on-surface); }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
