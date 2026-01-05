<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let productName = $state('');
	let hourlyRate = $state('');
	let fullDayRate = $state('');
	let requiresGuide = $state(false);
	let selectedEquipment = $state<Array<{type: string, categoryId: number, name: string, quantity?: number}>>([]);
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteProduct = $state(false);
	let pendingDeleteProductId = $state<number | null>(null);

	const trackedCategories = $derived(data.categories.filter(c => c.trackingType === 'tracked'));
	const genericCategories = $derived(data.categories.filter(c => c.trackingType === 'generic'));

	function addCategory(cat: typeof data.categories[0], quantity?: number) {
		if (selectedEquipment.some(i => i.categoryId === cat.id)) return;
		selectedEquipment = [...selectedEquipment, {
			type: cat.trackingType,
			categoryId: cat.id,
			name: cat.name,
			quantity: cat.trackingType === 'generic' ? (quantity || 1) : undefined
		}];
	}

	function removeItem(index: number) {
		selectedEquipment = selectedEquipment.filter((_, i) => i !== index);
	}

	async function createProduct() {
		if (!productName.trim()) {
			error = 'Product name required';
			return;
		}

		if (selectedEquipment.length === 0) {
			error = 'Add at least one category';
			return;
		}

		const hourly = parseFloat(hourlyRate) || 0;
		const fullDay = parseFloat(fullDayRate) || 0;

		if (hourly === 0 && fullDay === 0) {
			error = 'Set hourly or full day price';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/rental-products', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: productName,
				equipment: selectedEquipment,
				pricing: { hourly, fullDay },
				requiresGuide
			})
		});

		if (res.ok) {
			productName = '';
			hourlyRate = '';
			fullDayRate = '';
			requiresGuide = false;
			selectedEquipment = [];
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	function promptDeleteProduct(id: number) {
		pendingDeleteProductId = id;
		confirmDeleteProduct = true;
	}

	async function executeDeleteProduct() {
		if (!pendingDeleteProductId) return;
		await fetch('/api/rental-products', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteProductId })
		});
		await invalidateAll();
		pendingDeleteProductId = null;
	}

	async function toggleActive(id: number, current: boolean | null) {
		await fetch('/api/rental-products', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !current })
		});
		await invalidateAll();
	}

	async function toggleRequiresGuide(id: number, current: boolean | null) {
		await fetch('/api/rental-products', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, requiresGuide: !current })
		});
		await invalidateAll();
	}

	let genericQty: Record<number, string> = $state({});
</script>

<h1>Rental Products</h1>

<section>
	<h2>Create Product</h2>

	<div class="create-grid">
		<div>
			<h3>Product Info</h3>
			<div class="field-group">
				<md-outlined-text-field
					label="Product Name"
					value={productName}
					oninput={(e: Event) => productName = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			</div>

			<h3>Pricing</h3>
			<div class="pricing-row">
				<md-outlined-text-field
					label="Hourly ($)"
					type="number"
					step="0.01"
					value={hourlyRate}
					oninput={(e: Event) => hourlyRate = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<md-outlined-text-field
					label="Full Day ($)"
					type="number"
					step="0.01"
					value={fullDayRate}
					oninput={(e: Event) => fullDayRate = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			</div>

			<div class="guide-option">
				<label>
					<input type="checkbox" bind:checked={requiresGuide} />
					Requires Guide
				</label>
				<p class="hint">If checked, a guide must be assigned when creating a rental with this product</p>
			</div>

			<h3>Equipment Bundle</h3>
			{#if selectedEquipment.length === 0}
				<p>No equipment selected</p>
			{:else}
				<ul class="selected-list">
					{#each selectedEquipment as item, i}
						<li>
							<span>{item.name} ({item.type}) {item.quantity ? `x${item.quantity}` : ''}</span>
							<button onclick={() => removeItem(i)}>x</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if error}<p class="error">{error}</p>{/if}

			<md-filled-button onclick={createProduct} disabled={loading} class="create-btn">
				Create Product
			</md-filled-button>
		</div>

		<div>
			<h3>Tracked Categories</h3>
			<p class="hint">User will select a specific item from these categories at rental time</p>
			{#if trackedCategories.length === 0}
				<p>No tracked categories</p>
			{:else}
				<ul class="category-list">
					{#each trackedCategories as cat}
						{@const itemCount = data.trackedItems.filter(t => t.productTypeId === cat.id).length}
						<li>
							<span>{cat.name} ({itemCount} items)</span>
							<button
								onclick={() => addCategory(cat)}
								disabled={selectedEquipment.some(i => i.categoryId === cat.id)}
							>
								Add
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<h3>Generic Categories</h3>
			<p class="hint">User can include/exclude these at rental time</p>
			{#if genericCategories.length === 0}
				<p>No generic categories</p>
			{:else}
				<ul class="category-list">
					{#each genericCategories as cat}
						<li>
							<span>{cat.name}</span>
							<div class="qty-input">
								<input
									type="number"
									min="1"
									value={genericQty[cat.id] || '1'}
									oninput={(e: Event) => genericQty[cat.id] = (e.target as HTMLInputElement).value}
								/>
								<button
									onclick={() => addCategory(cat, parseInt(genericQty[cat.id]) || 1)}
									disabled={selectedEquipment.some(i => i.categoryId === cat.id)}
								>
									Add
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>

<section class="products-section">
	<h2>Products</h2>
	{#if data.products.length === 0}
		<p>No products created yet</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Equipment</th>
					<th>Pricing</th>
					<th>Guide</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.products as product}
					{@const equipment = product.equipment as Array<{name: string, quantity?: number, type: string}>}
					{@const pricing = product.pricing as {hourly?: number, fullDay?: number}}
					<tr>
						<td>{product.name}</td>
						<td>{equipment.map(e => e.name + (e.quantity ? ` x${e.quantity}` : '')).join(', ')}</td>
						<td>
							{#if pricing.hourly}${pricing.hourly}/hr{/if}
							{#if pricing.hourly && pricing.fullDay} / {/if}
							{#if pricing.fullDay}${pricing.fullDay}/day{/if}
						</td>
						<td>
							<button class="guide-toggle" class:active={product.requiresGuide} onclick={() => toggleRequiresGuide(product.id, product.requiresGuide)}>
								{product.requiresGuide ? 'Required' : 'No'}
							</button>
						</td>
						<td>{product.isActive ? 'Active' : 'Inactive'}</td>
						<td class="actions">
							<button onclick={() => toggleActive(product.id, product.isActive)}>
								{product.isActive ? 'Deactivate' : 'Activate'}
							</button>
							<button class="delete-btn" onclick={() => promptDeleteProduct(product.id)}>
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
	message="Are you sure you want to delete this rental product? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteProduct}
/>

<style>
	.create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
	.field-group { display: flex; flex-direction: column; gap: 0.5rem; max-width: 300px; }
	.pricing-row { display: flex; gap: 1rem; max-width: 300px; margin-top: 0.5rem; }
	.selected-list { list-style: none; padding: 0; }
	.selected-list li { display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.category-list { list-style: none; padding: 0; }
	.category-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.qty-input { display: flex; gap: 0.5rem; }
	.qty-input input { width: 60px; }
	.hint { font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin: 0.25rem 0 0.5rem; }
	.error { color: var(--md-sys-color-error); }
	.create-btn { margin-top: 1rem; }
	.products-section { margin-top: 2rem; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: 0.5rem; }
	th { border-bottom: 2px solid var(--md-sys-color-outline); }
	td { border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.actions { display: flex; gap: 0.5rem; }
	.delete-btn { color: var(--md-sys-color-error); }
	h3 { margin-top: 1rem; }
	.guide-option { margin-top: 1rem; }
	.guide-option label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
	.guide-toggle { padding: 0.25rem 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px; background: var(--md-sys-color-surface); cursor: pointer; font-size: 0.75rem; }
	.guide-toggle.active { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border-color: var(--md-sys-color-primary); }
</style>
