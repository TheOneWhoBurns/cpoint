<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';

	let {
		open = $bindable(false),
		booking = null as any,
		tourProducts = [] as any[],
		loading = $bindable(false),
		onSave
	}: {
		open: boolean;
		booking: any;
		tourProducts: any[];
		loading?: boolean;
		onSave: (id: number, data: { tourProductId: number; pax: number; activityDate?: string }) => Promise<void>;
	} = $props();

	let productId = $state<number | null>(null);
	let pax = $state(1);
	let activityDate = $state('');
	let error = $state('');
	let saving = $state(false);
	let dateInput = $state<HTMLInputElement | null>(null);
	let datePicker: flatpickr.Instance | null = null;

	$effect(() => {
		if (open && booking) {
			productId = booking.tourProductId;
			pax = booking.pax;
			activityDate = booking.activityDate ? new Date(booking.activityDate).toISOString().slice(0, 10) : '';
			error = '';
		}
	});

	$effect(() => {
		if (open && dateInput) {
			datePicker = flatpickr(dateInput, {
				dateFormat: 'Y-m-d', defaultDate: activityDate || undefined,
				onChange: ([date]) => { if (date) activityDate = date.toISOString(); }
			});
		}
		return () => { datePicker?.destroy(); };
	});

	function close() {
		if (saving) return;
		open = false;
	}

	async function submit() {
		if (!booking || !productId) { error = 'Select a tour product'; return; }
		saving = true;
		error = '';
		try {
			await onSave(booking.id, { tourProductId: productId, pax, activityDate: activityDate || undefined });
			close();
		} catch (e: any) {
			error = e.message || 'Failed to save';
		}
		saving = false;
	}
</script>

{#if open && booking}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-tour-title">
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">tour</span>
					<h2 id="edit-tour-title" class="md-headline-small">Edit Tour Booking</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">category</span>
						<span class="md-title-small">Tour Product</span>
					</label>
					<select class="form-select" bind:value={productId} disabled={loading || saving}>
						{#each tourProducts as product}
							<option value={product.id}>{product.name} - ${(product.price / 100).toFixed(2)}/person</option>
						{/each}
					</select>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">group</span>
						<span class="md-title-small">Number of Pax</span>
					</label>
					<div class="quantity-control">
						<button class="qty-btn" onclick={() => pax = Math.max(1, pax - 1)} disabled={loading || saving || pax <= 1} aria-label="Decrease pax">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{pax}</span>
						<button class="qty-btn" onclick={() => pax = Math.min(50, pax + 1)} disabled={loading || saving || pax >= 50} aria-label="Increase pax">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">calendar_today</span>
						<span class="md-title-small">Activity Date</span>
					</label>
					<input type="text" class="flatpickr-input form-date-input" placeholder="Select activity date..." bind:this={dateInput} disabled={loading || saving} readonly />
				</div>
				{#if error}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{error}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={saving}>Cancel</md-outlined-button>
				<md-filled-button onclick={submit} disabled={saving}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Save Changes
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
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.form-select { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-select:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.form-date-input { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-date-input:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.quantity-control { display: flex; align-items: center; gap: var(--md-sys-spacing-lg); padding-top: var(--md-sys-spacing-sm); }
	.qty-btn { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--md-sys-color-surface-container-high); border: none; border-radius: var(--md-sys-shape-corner-full); color: var(--md-sys-color-on-surface); cursor: pointer; flex-shrink: 0; }
	.qty-btn:hover:not(:disabled) { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
	.qty-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.qty-btn .material-symbols-rounded { font-size: 24px; }
	.qty-value { flex: 1; text-align: center; color: var(--md-sys-color-on-surface); }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@media (max-width: 768px) {
		.modal-content { max-width: 100%; max-height: 95vh; border-radius: var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0 0; margin-top: auto; }
		.modal-overlay { align-items: flex-end; padding: 0; }
	}
</style>
