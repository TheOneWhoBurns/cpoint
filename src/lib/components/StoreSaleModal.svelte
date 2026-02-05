<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		open = $bindable(false),
		storeProducts,
		loading = $bindable(false),
		onSubmit
	}: {
		open: boolean;
		storeProducts: any[];
		loading?: boolean;
		onSubmit: (productId: number, quantity: number) => Promise<void>;
	} = $props();

	let selectedStoreProductId = $state<number | null>(null);
	let saleQuantity = $state(1);
	let saleError = $state('');

	const selectedStoreProduct = $derived(selectedStoreProductId != null ? storeProducts.find((p: any) => p.id === selectedStoreProductId) : null);

	function close() {
		open = false;
		selectedStoreProductId = null;
		saleQuantity = 1;
		saleError = '';
	}

	async function handleSubmit() {
		if (!selectedStoreProductId) { saleError = 'Select a product'; return; }
		if (saleQuantity < 1) { saleError = 'Quantity must be at least 1'; return; }
		saleError = '';
		try {
			await onSubmit(selectedStoreProductId, saleQuantity);
			close();
		} catch (e: any) {
			saleError = e.message || 'Failed to create sale';
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">shopping_cart</span>
					<h2 class="md-headline-small">Store Sale</h2>
				</div>
				<md-icon-button onclick={close}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">inventory_2</span>
						<span class="md-title-small">Select Product</span>
					</label>
					<select class="form-select" onchange={(e) => { const v = e.currentTarget.value; selectedStoreProductId = v ? Number(v) : null; }} disabled={loading}>
						<option value="">Choose a product...</option>
						{#each storeProducts as product}
							<option value={product.id} selected={selectedStoreProductId === product.id}>{product.name} - ${Math.round(product.price / 100)} ({product.quantity} in stock)</option>
						{/each}
					</select>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">numbers</span>
						<span class="md-title-small">Quantity</span>
					</label>
					<div class="quantity-control">
						<button class="qty-btn" onclick={() => saleQuantity = Math.max(1, saleQuantity - 1)} disabled={loading || saleQuantity <= 1} aria-label="Decrease quantity">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{saleQuantity}</span>
						<button class="qty-btn" onclick={() => saleQuantity = Math.min(selectedStoreProduct?.quantity ?? 1, saleQuantity + 1)} disabled={loading || saleQuantity >= (selectedStoreProduct?.quantity ?? 1)} aria-label="Increase quantity">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
				</div>
				{#if saleError}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{saleError}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSubmit} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">point_of_sale</span>
					Complete Sale
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
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
