<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/select/outlined-select.js';
	import '@material/web/select/select-option.js';
	import '@material/web/chips/chip-set.js';
	import '@material/web/chips/filter-chip.js';
	import '@material/web/iconbutton/icon-button.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let categoryName = $state('');
	let trackingType = $state<'tracked' | 'generic'>('tracked');
	let selectedCategoryId = $state(0);
	let itemCode = $state('');
	let genericQuantity = $state('1');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteCategory = $state(false);
	let pendingDeleteCategoryId = $state<number | null>(null);
	let confirmDeleteItem = $state(false);
	let pendingDeleteItemId = $state<number | null>(null);

	$effect(() => {
		if (data.categories.length > 0 && !selectedCategoryId) {
			selectedCategoryId = data.categories[0].id;
		}
	});

	function getSelectedCategory() {
		return data.categories.find(c => c.id === selectedCategoryId);
	}

	async function createCategory() {
		if (!categoryName) {
			error = 'Name required';
			return;
		}
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createCategory', name: categoryName, trackingType })
		});

		if (res.ok) {
			categoryName = '';
			trackingType = 'tracked';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function addEquipment() {
		const cat = getSelectedCategory();
		if (!cat) {
			error = 'Select a category';
			return;
		}

		loading = true;
		error = '';

		let body: Record<string, unknown>;
		if (cat.trackingType === 'tracked') {
			if (!itemCode) {
				error = 'Code required';
				loading = false;
				return;
			}
			body = { action: 'addTrackedItem', categoryId: selectedCategoryId, code: itemCode };
		} else {
			const qty = parseInt(genericQuantity) || 1;
			if (qty < 1) {
				error = 'Quantity must be at least 1';
				loading = false;
				return;
			}
			body = { action: 'addGenericQuantity', categoryId: selectedCategoryId, quantity: qty };
		}

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (res.ok) {
			itemCode = '';
			genericQuantity = '1';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	function getCategoryName(id: number) {
		return data.categories.find(c => c.id === id)?.name || 'Unknown';
	}

	function promptDeleteCategory(id: number) {
		pendingDeleteCategoryId = id;
		confirmDeleteCategory = true;
	}

	async function executeDeleteCategory() {
		if (!pendingDeleteCategoryId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteCategory', categoryId: pendingDeleteCategoryId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteCategoryId = null;
	}

	function promptDeleteItem(id: number) {
		pendingDeleteItemId = id;
		confirmDeleteItem = true;
	}

	async function executeDeleteItem() {
		if (!pendingDeleteItemId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteTrackedItem', itemId: pendingDeleteItemId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteItemId = null;
	}

	async function updateGenericQuantity(id: number, newAvailable: number) {
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, availableQuantity: newAvailable })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}
</script>

<div class="equipment-page">
	<!-- Create Category Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">category</span>
			<h2 class="md-title-large">Create Category</h2>
		</div>
		<div class="card-content">
			<div class="form-row">
				<md-outlined-text-field
					label="Category Name"
					placeholder="e.g., Surfboards, Leashes"
					value={categoryName}
					oninput={(e: Event) => categoryName = (e.target as HTMLInputElement).value}
					class="flex-grow"
				>
					<span class="material-symbols-rounded" slot="leading-icon">label</span>
				</md-outlined-text-field>
			</div>

			<div class="type-selector">
				<span class="md-label-large">Tracking Type:</span>
				<div class="type-options">
					<button
						class="type-option"
						class:selected={trackingType === 'tracked'}
						onclick={() => trackingType = 'tracked'}
					>
						<span class="material-symbols-rounded">qr_code_2</span>
						<div class="type-info">
							<span class="md-label-large">Tracked</span>
							<span class="md-body-small">Unique items with codes</span>
						</div>
					</button>
					<button
						class="type-option"
						class:selected={trackingType === 'generic'}
						onclick={() => trackingType = 'generic'}
					>
						<span class="material-symbols-rounded">inventory</span>
						<div class="type-info">
							<span class="md-label-large">Generic</span>
							<span class="md-body-small">Quantity-based items</span>
						</div>
					</button>
				</div>
			</div>

			<md-filled-button onclick={createCategory} disabled={loading || !categoryName}>
				<span class="material-symbols-rounded" slot="icon">add</span>
				Create Category
			</md-filled-button>
		</div>
	</section>

	<!-- Categories Table -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">folder</span>
			<h2 class="md-title-large">Categories</h2>
			<span class="badge md-label-medium">{data.categories.length}</span>
		</div>

		{#if data.categories.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">folder_off</span>
				<p class="md-body-medium">No categories yet</p>
				<p class="md-body-small">Create your first category above</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Inventory</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.categories as cat}
							<tr>
								<td>
									<div class="cell-with-icon">
										<span class="material-symbols-rounded icon-sm">
											{cat.trackingType === 'tracked' ? 'qr_code_2' : 'inventory'}
										</span>
										<span class="md-body-medium">{cat.name}</span>
									</div>
								</td>
								<td>
									<span class="badge-small" class:tracked={cat.trackingType === 'tracked'} class:generic={cat.trackingType === 'generic'}>
										{cat.trackingType}
									</span>
								</td>
								<td>
									{#if cat.trackingType === 'generic'}
										<div class="quantity-control">
											<input
												type="number"
												min="0"
												value={cat.availableQuantity ?? 0}
												onchange={(e: Event) => updateGenericQuantity(cat.id, parseInt((e.target as HTMLInputElement).value) || 0)}
												class="quantity-input"
											/>
											<span class="md-body-small">/ {cat.totalQuantity}</span>
										</div>
									{:else}
										<span class="md-body-medium">{data.trackedItems.filter(t => t.productTypeId === cat.id).length} items</span>
									{/if}
								</td>
								<td>
									<span class="status-badge" class:active={cat.isActive} class:inactive={!cat.isActive}>
										{cat.isActive ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td>
									<md-icon-button onclick={() => promptDeleteCategory(cat.id)} aria-label="Delete category">
										<span class="material-symbols-rounded">delete</span>
									</md-icon-button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if error}
			<div class="error-message">
				<span class="material-symbols-rounded">error</span>
				<span class="md-body-medium">{error}</span>
			</div>
		{/if}
	</section>

	<!-- Register Equipment Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">add_circle</span>
			<h2 class="md-title-large">Register Equipment</h2>
		</div>

		{#if data.categories.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">info</span>
				<p class="md-body-medium">Create a category first</p>
			</div>
		{:else}
			<div class="card-content">
				<div class="form-row">
					<select bind:value={selectedCategoryId} class="category-select">
						{#each data.categories as cat}
							<option value={cat.id}>
								{cat.name} ({cat.trackingType})
							</option>
						{/each}
					</select>
				</div>

				{#if getSelectedCategory()?.trackingType === 'tracked'}
					<div class="form-row">
						<md-outlined-text-field
							label="Item Code"
							placeholder="e.g., SURF-001"
							value={itemCode}
							oninput={(e: Event) => itemCode = (e.target as HTMLInputElement).value}
							class="flex-grow"
						>
							<span class="material-symbols-rounded" slot="leading-icon">qr_code</span>
						</md-outlined-text-field>
					</div>
					<p class="helper-text md-body-small">
						<span class="material-symbols-rounded icon-sm">info</span>
						Register items one by one. Each needs a unique code.
					</p>
				{:else}
					<div class="form-row">
						<md-outlined-text-field
							label="Quantity to add"
							type="number"
							min="1"
							value={genericQuantity}
							oninput={(e: Event) => genericQuantity = (e.target as HTMLInputElement).value}
							class="flex-grow"
						>
							<span class="material-symbols-rounded" slot="leading-icon">add_shopping_cart</span>
						</md-outlined-text-field>
					</div>
					<p class="helper-text md-body-small">
						<span class="material-symbols-rounded icon-sm">info</span>
						Current total: {getSelectedCategory()?.totalQuantity ?? 0} items
					</p>
				{/if}

				<md-filled-button onclick={addEquipment} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					{getSelectedCategory()?.trackingType === 'tracked' ? 'Register Item' : 'Add Quantity'}
				</md-filled-button>
			</div>
		{/if}
	</section>

	<!-- Tracked Items Table -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">list_alt</span>
			<h2 class="md-title-large">Tracked Items</h2>
			<span class="badge md-label-medium">{data.trackedItems.length}</span>
		</div>

		{#if data.trackedItems.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">inventory_2</span>
				<p class="md-body-medium">No tracked items registered</p>
				<p class="md-body-small">Add items using the form above</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Category</th>
							<th>Code</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.trackedItems as item}
							<tr>
								<td>
									<span class="md-body-medium">{getCategoryName(item.productTypeId ?? 0)}</span>
								</td>
								<td>
									<code class="item-code">{item.code}</code>
								</td>
								<td>
									<span class="status-badge" class:available={item.status === 'available'} class:rented={item.status === 'rented'}>
										{item.status}
									</span>
								</td>
								<td>
									<md-icon-button onclick={() => promptDeleteItem(item.id)} aria-label="Delete item">
										<span class="material-symbols-rounded">delete</span>
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
	bind:open={confirmDeleteCategory}
	title="Delete Category"
	message="Are you sure you want to delete this category? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteCategory}
/>

<ConfirmModal
	bind:open={confirmDeleteItem}
	title="Delete Item"
	message="Are you sure you want to delete this tracked item? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteItem}
/>

<style>
	.equipment-page {
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
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Form Styles */
	.form-row {
		display: flex;
		gap: var(--md-sys-spacing-md);
		align-items: flex-start;
	}

	.form-row md-outlined-text-field {
		width: 100%;
	}

	.flex-grow {
		flex: 1;
	}

	/* Type Selector */
	.type-selector {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.type-options {
		display: flex;
		gap: var(--md-sys-spacing-md);
	}

	.type-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container);
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.type-option:hover {
		background: var(--md-sys-color-surface-container-high);
	}

	.type-option.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
	}

	.type-option .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-on-surface-variant);
	}

	.type-option.selected .material-symbols-rounded {
		color: var(--md-sys-color-on-primary-container);
	}

	.type-info {
		display: flex;
		flex-direction: column;
		text-align: left;
	}

	.type-info .md-label-large {
		color: var(--md-sys-color-on-surface);
	}

	.type-info .md-body-small {
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Category Select */
	.category-select {
		width: 100%;
		padding: var(--md-sys-spacing-md);
		font-size: 1rem;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	/* Helper Text */
	.helper-text {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
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

	.data-table tbody tr:hover {
		background: var(--md-sys-color-surface-container);
	}

	.cell-with-icon {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.icon-sm {
		font-size: 18px;
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Badges */
	.badge-small {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		text-transform: capitalize;
	}

	.badge-small.tracked {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.badge-small.generic {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.status-badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		text-transform: capitalize;
	}

	.status-badge.active,
	.status-badge.available {
		background: var(--md-sys-color-success-container);
		color: var(--md-sys-color-on-success-container);
	}

	.status-badge.inactive {
		background: var(--md-sys-color-surface-container-highest);
		color: var(--md-sys-color-on-surface-variant);
	}

	.status-badge.rented {
		background: var(--md-sys-color-warning-container);
		color: var(--md-sys-color-on-warning-container);
	}

	/* Quantity Control */
	.quantity-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.quantity-input {
		width: 70px;
		padding: 6px 10px;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font-size: 0.875rem;
		text-align: center;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	/* Item Code */
	.item-code {
		font-family: monospace;
		padding: 4px 8px;
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-extra-small);
		font-size: 0.875rem;
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

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
		margin: var(--md-sys-spacing-md);
	}

	.error-message .material-symbols-rounded {
		font-size: 20px;
	}

	/* Icon Button Styles */
	md-icon-button {
		--md-icon-button-icon-color: var(--md-sys-color-error);
	}
</style>
