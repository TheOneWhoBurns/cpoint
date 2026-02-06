<script lang="ts">
	import StoreSaleModal from '$lib/components/StoreSaleModal.svelte';
	import { createStoreSale } from '$lib/services/store-sale.service';
	import { toastStore } from '$lib/stores/toast';

	let {
		storeSales,
		storeProducts,
		shiftId,
		onDataChanged,
		onPromptDelete
	}: {
		storeSales: any[];
		storeProducts: any[];
		shiftId: number;
		onDataChanged: () => void;
		onPromptDelete: (type: string, id: number, label: string) => void;
	} = $props();

	let showSaleModal = $state(false);
	let saleLoading = $state(false);

	async function handleCreateSale(productId: number, quantity: number) {
		saleLoading = true;
		try {
			await createStoreSale(shiftId, productId, quantity);
			showSaleModal = false;
			toastStore.success('Sale recorded');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to create sale');
		} finally {
			saleLoading = false;
		}
	}

	export function openSaleModal() {
		showSaleModal = true;
	}

	const salesTotalCents = $derived(storeSales.reduce((sum: number, s: any) => sum + s.total, 0));
</script>

<div class="sales-section">
	{#if storeSales.length === 0}
		<div class="empty-state">
			<span class="material-symbols-rounded empty-icon">storefront</span>
			<p class="md-body-large">No sales this shift</p>
		</div>
	{:else}
		<div class="sales-list">
			{#each storeSales as sale (sale.id)}
				<div class="sale-row">
					<div class="sale-info">
						<span class="md-body-medium">{sale.productName}</span>
						<span class="md-body-small sale-meta">x{sale.quantity} @ ${(sale.unitPrice / 100).toFixed(2)}</span>
					</div>
					<div class="sale-actions">
						<span class="md-title-small">${(sale.total / 100).toFixed(2)}</span>
						<button class="delete-btn" onclick={() => onPromptDelete('storeSale', sale.id, sale.productName || 'Sale')} aria-label="Delete sale">
							<span class="material-symbols-rounded delete-icon">delete</span>
						</button>
					</div>
				</div>
			{/each}
			<div class="sales-total">
				<span class="md-title-medium">Total</span>
				<span class="md-title-medium">${(salesTotalCents / 100).toFixed(2)}</span>
			</div>
		</div>
	{/if}
</div>

<StoreSaleModal
	bind:open={showSaleModal}
	{storeProducts}
	bind:loading={saleLoading}
	onSubmit={handleCreateSale}
/>

<style>
	.sales-section { padding: var(--md-sys-spacing-lg); }
	.sales-list {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}
	.sale-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border-radius: var(--md-sys-shape-corner-medium);
		border: 1px solid var(--md-sys-color-outline-variant);
	}
	.sale-info { display: flex; flex-direction: column; }
	.sale-meta { color: var(--md-sys-color-on-surface-variant); }
	.sale-actions { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); }
	.delete-btn {
		background: none; border: none; cursor: pointer; padding: var(--md-sys-spacing-xs);
		border-radius: var(--md-sys-shape-corner-full);
		display: flex; align-items: center;
	}
	.delete-btn:hover { background: var(--md-sys-color-error-container); }
	.delete-icon { font-size: 20px; color: var(--md-sys-color-error); }
	.sales-total {
		display: flex; justify-content: space-between;
		padding: var(--md-sys-spacing-md);
		border-top: 2px solid var(--md-sys-color-outline);
		margin-top: var(--md-sys-spacing-sm);
	}
	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		justify-content: center; padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
	}
	.empty-icon { font-size: 48px; opacity: 0.5; }
</style>
