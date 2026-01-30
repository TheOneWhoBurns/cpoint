<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let productName = $state('');
	let productCategory = $state('');
	let productPrice = $state('');
	let productQuantity = $state('1');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteProduct = $state(false);
	let pendingDeleteProductId = $state<number | null>(null);

	async function createProduct() {
		if (!productName.trim()) {
			error = 'Product name required';
			return;
		}

		const price = parseFloat(productPrice) || 0;
		if (price < 0) {
			error = 'Price must be valid';
			return;
		}

		const qty = parseInt(productQuantity) || 0;
		if (qty < 0) {
			error = 'Quantity must be valid';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/store-products', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: productName,
				category: productCategory || null,
				price,
				quantity: qty
			})
		});

		if (res.ok) {
			productName = '';
			productCategory = '';
			productPrice = '';
			productQuantity = '1';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create product';
		}
		loading = false;
	}

	async function updateQuantity(id: number, newQuantity: number) {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/store-products', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, quantity: newQuantity })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				const d = await res.json();
				error = d.error || 'Failed to update';
			}
		} catch {
			error = 'Network error';
		}
		loading = false;
	}

	async function toggleActive(id: number, isActive: boolean) {
		loading = true;
		error = '';

		const res = await fetch('/api/store-products', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	function promptDeleteProduct(id: number) {
		pendingDeleteProductId = id;
		confirmDeleteProduct = true;
	}

	async function executeDeleteProduct() {
		if (!pendingDeleteProductId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/store-products', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteProductId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteProductId = null;
	}

</script>

<div class="store-products-page">
	<!-- Add Product Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">add_shopping_cart</span>
			<h2 class="md-title-large">Add Store Product</h2>
		</div>
		<div class="card-content">
			<div class="form-grid">
				<md-outlined-text-field
					label="Product Name"
					placeholder="e.g., Sunscreen SPF 50"
					value={productName}
					oninput={(e: Event) => productName = (e.target as HTMLInputElement).value}
					disabled={loading}
				>
					<span class="material-symbols-rounded" slot="leading-icon">label</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Category"
					placeholder="e.g., Suncare, Snacks"
					value={productCategory}
					oninput={(e: Event) => productCategory = (e.target as HTMLInputElement).value}
					disabled={loading}
					supporting-text="Optional - for organizing products"
				>
					<span class="material-symbols-rounded" slot="leading-icon">category</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Price"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					value={productPrice}
					oninput={(e: Event) => productPrice = (e.target as HTMLInputElement).value}
					disabled={loading}
					prefix-text="$"
				>
					<span class="material-symbols-rounded" slot="leading-icon">payments</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Initial Quantity"
					type="number"
					min="0"
					value={productQuantity}
					oninput={(e: Event) => productQuantity = (e.target as HTMLInputElement).value}
					disabled={loading}
				>
					<span class="material-symbols-rounded" slot="leading-icon">inventory</span>
				</md-outlined-text-field>
			</div>

			{#if error}
				<div class="error-message">
					<span class="material-symbols-rounded">error</span>
					<span class="md-body-medium">{error}</span>
				</div>
			{/if}

			<div class="form-actions">
				<md-filled-button onclick={createProduct} disabled={loading || !productName}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					Add Product
				</md-filled-button>
			</div>
		</div>
	</section>

	<!-- Products List -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">shopping_bag</span>
			<h2 class="md-title-large">Store Products</h2>
			<span class="badge md-label-medium">{data.storeProducts.length}</span>
		</div>

		{#if data.storeProducts.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">shopping_bag</span>
				<p class="md-body-medium">No products added yet</p>
				<p class="md-body-small">Add your first product above</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Product</th>
							<th>Category</th>
							<th>Price</th>
							<th>Quantity</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.storeProducts as product}
							<tr class:inactive={!product.isActive}>
								<td>
									<div class="product-cell">
										<span class="material-symbols-rounded product-icon">shopping_bag</span>
										<span class="md-body-medium product-name">{product.name}</span>
									</div>
								</td>
								<td>
									{#if product.category}
										<span class="category-badge">{product.category}</span>
									{:else}
										<span class="md-body-small no-category">—</span>
									{/if}
								</td>
								<td>
									<span class="price-value">${(product.price / 100).toFixed(2)}</span>
								</td>
								<td>
									<div class="quantity-control">
										<input
											type="number"
											min="0"
											value={product.quantity}
											onchange={(e: Event) => updateQuantity(product.id, parseInt((e.target as HTMLInputElement).value) || 0)}
											disabled={loading}
											class="quantity-input"
										/>
										{#if product.quantity === 0}
											<span class="out-of-stock">Out of stock</span>
										{:else if product.quantity <= 5}
											<span class="low-stock">Low</span>
										{/if}
									</div>
								</td>
								<td>
									<label class="switch-label">
										<md-switch
											selected={product.isActive}
											onchange={() => toggleActive(product.id, product.isActive)}
											disabled={loading}
											aria-label="Toggle product status"
										></md-switch>
									</label>
								</td>
								<td>
									<md-icon-button
										onclick={() => promptDeleteProduct(product.id)}
										disabled={loading}
										aria-label="Delete product"
									>
										<span class="material-symbols-rounded delete-icon">delete</span>
									</md-icon-button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<ConfirmModal
	bind:open={confirmDeleteProduct}
	title="Delete Product"
	message="Are you sure you want to delete this store product? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteProduct}
/>

<style>
	.store-products-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 1000px;
	}

	/* Card Styles */
	.card {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-large);
		border: 1px solid var(--md-sys-color-outline-variant);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface-container-low);
	}

	.card-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
		font-size: 24px;
	}

	.card-header h2 {
		flex: 1;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.card-content {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	/* Badge */
	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Form Styles */
	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--md-sys-spacing-md);
	}

	.form-grid md-outlined-text-field {
		width: 100%;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--md-sys-spacing-sm);
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-message .material-symbols-rounded {
		font-size: 20px;
	}

	/* Table Styles */
	.table-container {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th,
	.data-table td {
		padding: var(--md-sys-spacing-md);
		text-align: left;
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	.data-table th {
		font: var(--md-sys-typescale-label-large);
		color: var(--md-sys-color-on-surface-variant);
		background: var(--md-sys-color-surface-container-low);
	}

	.data-table tbody tr {
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.data-table tbody tr:hover {
		background: var(--md-sys-color-surface-container);
	}

	.data-table tbody tr.inactive {
		opacity: 0.6;
	}

	/* Product Cell */
	.product-cell {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.product-icon {
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.product-name {
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	/* Category Badge */
	.category-badge {
		display: inline-block;
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-medium);
	}

	.no-category {
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Price Value */
	.price-value {
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-primary);
	}

	/* Quantity Control */
	.quantity-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.quantity-input {
		width: 70px;
		padding: var(--md-sys-spacing-sm);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font-size: 0.875rem;
		text-align: center;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	.out-of-stock {
		font: var(--md-sys-typescale-label-small);
		color: var(--md-sys-color-error);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.low-stock {
		font: var(--md-sys-typescale-label-small);
		color: var(--md-sys-color-warning);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-warning-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	/* Delete Icon */
	.delete-icon {
		color: var(--md-sys-color-error);
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-xxl);
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty-state .material-symbols-rounded {
		font-size: 48px;
		opacity: 0.5;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
