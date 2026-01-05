<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';
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

<h1>Store Products</h1>

<section>
	<h2>Add Product</h2>
	<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
		<md-outlined-text-field
			label="Product Name *"
			value={productName}
			oninput={(e: Event) => productName = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="Category (optional)"
			value={productCategory}
			oninput={(e: Event) => productCategory = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="Price ($)"
			type="number"
			step="0.01"
			value={productPrice}
			oninput={(e: Event) => productPrice = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="Initial Quantity"
			type="number"
			min="0"
			value={productQuantity}
			oninput={(e: Event) => productQuantity = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}

		<md-filled-button onclick={createProduct} disabled={loading}>
			Add Product
		</md-filled-button>
	</div>
</section>

<section style="margin-top: 2rem;">
	<h2>Products</h2>
	{#if data.storeProducts.length === 0}
		<p>No products added yet</p>
	{:else}
		<table style="width: 100%; border-collapse: collapse;">
			<thead>
				<tr>
					<th style="text-align: left; padding: 0.5rem;">Name</th>
					<th style="text-align: left; padding: 0.5rem;">Category</th>
					<th style="text-align: left; padding: 0.5rem;">Price</th>
					<th style="text-align: left; padding: 0.5rem;">Quantity</th>
					<th style="text-align: left; padding: 0.5rem;">Status</th>
					<th style="text-align: left; padding: 0.5rem;">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.storeProducts as product}
					<tr>
						<td style="padding: 0.5rem;">{product.name}</td>
						<td style="padding: 0.5rem;">{product.category || '-'}</td>
						<td style="padding: 0.5rem;">${(product.price / 100).toFixed(2)}</td>
						<td style="padding: 0.5rem;">
							<input
								type="number"
								min="0"
								value={product.quantity}
								onchange={(e: Event) => updateQuantity(product.id, parseInt((e.target as HTMLInputElement).value) || 0)}
								disabled={loading}
								style="width: 80px; padding: 0.25rem;"
							/>
						</td>
						<td style="padding: 0.5rem;">{product.isActive ? 'Active' : 'Inactive'}</td>
						<td style="padding: 0.5rem; display: flex; gap: 0.5rem;">
							<button
								onclick={() => toggleActive(product.id, product.isActive)}
								disabled={loading}
								style="font-size: 0.75rem;"
							>
								{product.isActive ? 'Deactivate' : 'Activate'}
							</button>
							<button
								onclick={() => promptDeleteProduct(product.id)}
								disabled={loading}
								style="color: var(--md-sys-color-error); font-size: 0.75rem;"
							>
								Delete
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<ConfirmModal
	bind:open={confirmDeleteProduct}
	title="Delete Product"
	message="Are you sure you want to delete this store product? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteProduct}
/>
