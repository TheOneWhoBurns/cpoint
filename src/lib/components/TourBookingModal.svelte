<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import GuideSelector from './GuideSelector.svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';

	let {
		open = $bindable(false),
		tourProducts,
		guides,
		loading = $bindable(false),
		onSubmit,
		onVerifyPin
	}: {
		open: boolean;
		tourProducts: any[];
		guides: any[];
		loading?: boolean;
		onSubmit: (data: { tourProductId: number; pax: number; activityDate: string; guideId: number | null }) => Promise<void>;
		onVerifyPin: (guideId: number, pin: string) => Promise<boolean>;
	} = $props();

	let selectedTourProductId = $state<number | null>(null);
	let tourPax = $state(1);
	let tourActivityDate = $state('');
	let tourSelectedGuideId = $state<number | null>(null);
	let tourError = $state('');
	let activityDateInput = $state<HTMLInputElement | null>(null);
	let activityDatePicker: flatpickr.Instance | null = null;

	const selectedTourProduct = $derived(selectedTourProductId ? tourProducts.find((p: any) => p.id === selectedTourProductId) : null);

	function initFlatpickr() {
		if (activityDateInput && !activityDatePicker) {
			activityDatePicker = flatpickr(activityDateInput, {
				dateFormat: 'Y-m-d',
				onChange: (dates) => {
					if (dates[0]) tourActivityDate = dates[0].toISOString();
				}
			});
		}
	}

	function destroyFlatpickr() {
		activityDatePicker?.destroy();
		activityDatePicker = null;
	}

	$effect(() => {
		if (open) {
			tourError = '';
			selectedTourProductId = null;
			tourPax = 1;
			tourActivityDate = '';
			tourSelectedGuideId = null;
			setTimeout(initFlatpickr, 0);
		}
	});

	function close() {
		open = false;
		destroyFlatpickr();
	}

	async function handleSubmit() {
		if (!selectedTourProductId) { tourError = 'Select a tour product'; return; }
		if (tourPax < 1) { tourError = 'At least 1 pax required'; return; }
		if (!tourActivityDate) { tourError = 'Activity date required'; return; }
		tourError = '';
		try {
			await onSubmit({ tourProductId: selectedTourProductId, pax: tourPax, activityDate: tourActivityDate, guideId: tourSelectedGuideId || null });
			close();
		} catch (e: any) {
			tourError = e.message || 'Failed to create booking';
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">tour</span>
					<h2 class="md-headline-small">New Tour Booking</h2>
				</div>
				<md-icon-button onclick={close}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">category</span>
						<span class="md-title-small">Tour Product</span>
					</label>
					<select class="form-select" bind:value={selectedTourProductId} disabled={loading}>
						<option value={null}>Choose a tour...</option>
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
						<button class="qty-btn" onclick={() => tourPax = Math.max(1, tourPax - 1)} disabled={loading || tourPax <= 1} aria-label="Decrease pax">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{tourPax}</span>
						<button class="qty-btn" onclick={() => tourPax = Math.min(50, tourPax + 1)} disabled={loading || tourPax >= 50} aria-label="Increase pax">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
					{#if selectedTourProduct}
						<p class="form-hint md-body-small">Total: ${((selectedTourProduct.price / 100) * tourPax).toFixed(2)} ({tourPax} x ${(selectedTourProduct.price / 100).toFixed(2)})</p>
					{/if}
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">calendar_today</span>
						<span class="md-title-small">Activity Date</span>
					</label>
					<input type="text" class="flatpickr-input form-date-input" placeholder="Select activity date..." bind:this={activityDateInput} disabled={loading} readonly />
				</div>
				{#if selectedTourProduct?.requiresGuide}
					<div class="form-section">
						<GuideSelector {guides} bind:selectedGuideId={tourSelectedGuideId} {loading} onVerifyPin={onVerifyPin} />
					</div>
				{/if}
				{#if tourError}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{tourError}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSubmit} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Create Booking
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
	.form-select { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-select:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.quantity-control { display: flex; align-items: center; gap: var(--md-sys-spacing-lg); padding-top: var(--md-sys-spacing-sm); }
	.qty-btn { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--md-sys-color-surface-container-high); border: none; border-radius: var(--md-sys-shape-corner-full); color: var(--md-sys-color-on-surface); cursor: pointer; flex-shrink: 0; transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard); }
	.qty-btn:hover:not(:disabled) { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
	.qty-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.qty-value { flex: 1; text-align: center; color: var(--md-sys-color-on-surface); }
	.form-hint { color: var(--md-sys-color-on-surface-variant); margin: 0; }
	.form-date-input { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-date-input:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
