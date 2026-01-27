<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';
	import '@material/web/checkbox/checkbox.js';
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
		loading = true;
		const res = await fetch('/api/rental-products', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteProductId })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete product';
		}
		pendingDeleteProductId = null;
		loading = false;
	}

	async function toggleActive(id: number, current: boolean | null) {
		const res = await fetch('/api/rental-products', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !current })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update product';
		}
	}

	async function toggleRequiresGuide(id: number, current: boolean | null) {
		const res = await fetch('/api/rental-products', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, requiresGuide: !current })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update product';
		}
	}

	let genericQty: Record<number, string> = $state({});
</script>

<div class="rental-products-page">
	<!-- Create Product Card -->
	<section class="card create-card">
		<div class="card-header">
			<span class="material-symbols-rounded">add_box</span>
			<h2 class="md-title-large">Create Rental Product</h2>
		</div>
		<div class="card-content">
			<div class="create-grid">
				<!-- Left Column: Product Info -->
				<div class="form-column">
					<div class="form-section">
						<h3 class="md-title-medium section-title">
							<span class="material-symbols-rounded">info</span>
							Product Info
						</h3>
						<md-outlined-text-field
							label="Product Name"
							placeholder="e.g., Surfboard Package"
							value={productName}
							oninput={(e: Event) => productName = (e.target as HTMLInputElement).value}
						>
							<span class="material-symbols-rounded" slot="leading-icon">label</span>
						</md-outlined-text-field>
					</div>

					<div class="form-section">
						<h3 class="md-title-medium section-title">
							<span class="material-symbols-rounded">payments</span>
							Pricing
						</h3>
						<div class="pricing-row">
							<md-outlined-text-field
								label="Hourly Rate"
								type="number"
								step="0.01"
								min="0"
								value={hourlyRate}
								oninput={(e: Event) => hourlyRate = (e.target as HTMLInputElement).value}
								prefix-text="$"
							>
								<span class="material-symbols-rounded" slot="leading-icon">schedule</span>
							</md-outlined-text-field>
							<md-outlined-text-field
								label="Full Day Rate"
								type="number"
								step="0.01"
								min="0"
								value={fullDayRate}
								oninput={(e: Event) => fullDayRate = (e.target as HTMLInputElement).value}
								prefix-text="$"
							>
								<span class="material-symbols-rounded" slot="leading-icon">today</span>
							</md-outlined-text-field>
						</div>
					</div>

					<div class="form-section">
						<label class="guide-checkbox">
							<md-checkbox
								checked={requiresGuide}
								onchange={(e: Event) => requiresGuide = (e.target as HTMLInputElement).checked}
							></md-checkbox>
							<div class="checkbox-label">
								<span class="md-label-large">Requires Guide</span>
								<span class="md-body-small">Guide must be assigned when creating rental</span>
							</div>
						</label>
					</div>

					<div class="form-section">
						<h3 class="md-title-medium section-title">
							<span class="material-symbols-rounded">inventory_2</span>
							Equipment Bundle
						</h3>
						{#if selectedEquipment.length === 0}
							<div class="empty-bundle">
								<span class="material-symbols-rounded">inventory</span>
								<span class="md-body-medium">No equipment selected</span>
							</div>
						{:else}
							<ul class="selected-list">
								{#each selectedEquipment as item, i}
									<li class="selected-item">
										<span class="material-symbols-rounded icon-sm">
											{item.type === 'tracked' ? 'qr_code_2' : 'inventory'}
										</span>
										<span class="md-body-medium">{item.name}</span>
										{#if item.quantity}
											<span class="quantity-badge">x{item.quantity}</span>
										{/if}
										<md-icon-button onclick={() => removeItem(i)} aria-label="Remove">
											<span class="material-symbols-rounded">close</span>
										</md-icon-button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					{#if error}
						<div class="error-message">
							<span class="material-symbols-rounded">error</span>
							<span class="md-body-medium">{error}</span>
						</div>
					{/if}

					<md-filled-button onclick={createProduct} disabled={loading}>
						<span class="material-symbols-rounded" slot="icon">add</span>
						Create Product
					</md-filled-button>
				</div>

				<!-- Right Column: Equipment Selection -->
				<div class="form-column equipment-column">
					<div class="form-section">
						<h3 class="md-title-medium section-title">
							<span class="material-symbols-rounded">qr_code_2</span>
							Tracked Categories
						</h3>
						<p class="md-body-small helper-text">User selects specific item at rental time</p>
						{#if trackedCategories.length === 0}
							<p class="md-body-medium empty-text">No tracked categories</p>
						{:else}
							<ul class="category-list">
								{#each trackedCategories as cat}
									{@const itemCount = data.trackedItems.filter(t => t.productTypeId === cat.id).length}
									{@const isSelected = selectedEquipment.some(i => i.categoryId === cat.id)}
									<li class="category-item" class:selected={isSelected}>
										<div class="category-info">
											<span class="md-body-medium">{cat.name}</span>
											<span class="md-label-small">{itemCount} items</span>
										</div>
										<md-filled-tonal-button
											onclick={() => addCategory(cat)}
											disabled={isSelected}
										>
											{isSelected ? 'Added' : 'Add'}
										</md-filled-tonal-button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="form-section">
						<h3 class="md-title-medium section-title">
							<span class="material-symbols-rounded">inventory</span>
							Generic Categories
						</h3>
						<p class="md-body-small helper-text">User can include/exclude at rental time</p>
						{#if genericCategories.length === 0}
							<p class="md-body-medium empty-text">No generic categories</p>
						{:else}
							<ul class="category-list">
								{#each genericCategories as cat}
									{@const isSelected = selectedEquipment.some(i => i.categoryId === cat.id)}
									<li class="category-item" class:selected={isSelected}>
										<div class="category-info">
											<span class="md-body-medium">{cat.name}</span>
										</div>
										<div class="qty-input-group">
											<input
												type="number"
												min="1"
												value={genericQty[cat.id] || '1'}
												oninput={(e: Event) => genericQty[cat.id] = (e.target as HTMLInputElement).value}
												class="qty-input"
												disabled={isSelected}
											/>
											<md-filled-tonal-button
												onclick={() => addCategory(cat, parseInt(genericQty[cat.id]) || 1)}
												disabled={isSelected}
											>
												{isSelected ? 'Added' : 'Add'}
											</md-filled-tonal-button>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Products List -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">inventory_2</span>
			<h2 class="md-title-large">Rental Products</h2>
			<span class="badge md-label-medium">{data.products.length}</span>
		</div>

		{#if data.products.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">inventory_2</span>
				<p class="md-body-medium">No products created yet</p>
				<p class="md-body-small">Create your first product above</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
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
								<td>
									<span class="md-body-medium product-name">{product.name}</span>
								</td>
								<td>
									<div class="equipment-chips">
										{#each equipment as e}
											<span class="equipment-chip">
												{e.name}{e.quantity ? ` x${e.quantity}` : ''}
											</span>
										{/each}
									</div>
								</td>
								<td>
									<div class="pricing-info">
										{#if pricing.hourly}
											<span class="price-tag hourly">${pricing.hourly}/hr</span>
										{/if}
										{#if pricing.fullDay}
											<span class="price-tag fullday">${pricing.fullDay}/day</span>
										{/if}
									</div>
								</td>
								<td>
									<button
										class="guide-toggle"
										class:active={product.requiresGuide}
										onclick={() => toggleRequiresGuide(product.id, product.requiresGuide)}
									>
										<span class="material-symbols-rounded icon-sm">
											{product.requiresGuide ? 'check' : 'close'}
										</span>
										{product.requiresGuide ? 'Required' : 'No'}
									</button>
								</td>
								<td>
									<span class="status-badge" class:active={product.isActive} class:inactive={!product.isActive}>
										{product.isActive ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td>
									<div class="action-buttons">
										<md-icon-button onclick={() => toggleActive(product.id, product.isActive)} aria-label="Toggle active">
											<span class="material-symbols-rounded">
												{product.isActive ? 'visibility_off' : 'visibility'}
											</span>
										</md-icon-button>
										<md-icon-button onclick={() => promptDeleteProduct(product.id)} aria-label="Delete">
											<span class="material-symbols-rounded delete-icon">delete</span>
										</md-icon-button>
									</div>
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
	message="Are you sure you want to delete this rental product? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteProduct}
/>

<style>
	.rental-products-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 1200px;
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
	}

	/* Badge */
	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Create Grid */
	.create-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--md-sys-spacing-xl);
	}

	.form-column {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
	}

	.equipment-column {
		background: var(--md-sys-color-surface-container-low);
		padding: var(--md-sys-spacing-lg);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.section-title .material-symbols-rounded {
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.form-section md-outlined-text-field {
		width: 100%;
	}

	.pricing-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--md-sys-spacing-md);
	}

	/* Guide Checkbox */
	.guide-checkbox {
		display: flex;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
		cursor: pointer;
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.checkbox-label {
		display: flex;
		flex-direction: column;
	}

	.checkbox-label .md-body-small {
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Equipment Bundle */
	.empty-bundle {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container);
		border-radius: var(--md-sys-shape-corner-small);
		color: var(--md-sys-color-on-surface-variant);
	}

	.selected-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.selected-item {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-secondary-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.selected-item .md-body-medium {
		flex: 1;
		color: var(--md-sys-color-on-secondary-container);
	}

	.quantity-badge {
		padding: 2px 8px;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-small);
	}

	.selected-item md-icon-button {
		--md-icon-button-icon-size: 18px;
		--md-icon-button-state-layer-size: 32px;
	}

	/* Category List */
	.helper-text {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
	}

	.empty-text {
		color: var(--md-sys-color-on-surface-variant);
	}

	.category-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.category-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-small);
		border: 1px solid var(--md-sys-color-outline-variant);
	}

	.category-item.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
	}

	.category-info {
		display: flex;
		flex-direction: column;
	}

	.category-info .md-label-small {
		color: var(--md-sys-color-on-surface-variant);
	}

	.qty-input-group {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.qty-input {
		width: 60px;
		padding: 8px;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		text-align: center;
		font-size: 0.875rem;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
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

	.product-name {
		font-weight: 500;
	}

	.equipment-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.equipment-chip {
		padding: 2px 8px;
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
	}

	.pricing-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.price-tag {
		font: var(--md-sys-typescale-label-medium);
	}

	.price-tag.hourly {
		color: var(--md-sys-color-primary);
	}

	.price-tag.fullday {
		color: var(--md-sys-color-tertiary);
	}

	.guide-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 12px;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-full);
		background: var(--md-sys-color-surface);
		cursor: pointer;
		font: var(--md-sys-typescale-label-medium);
		color: var(--md-sys-color-on-surface);
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.guide-toggle:hover {
		background: var(--md-sys-color-surface-container);
	}

	.guide-toggle.active {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-color: var(--md-sys-color-tertiary);
	}

	.icon-sm {
		font-size: 16px;
	}

	/* Status Badge */
	.status-badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
	}

	.status-badge.active {
		background: var(--md-sys-color-success-container);
		color: var(--md-sys-color-on-success-container);
	}

	.status-badge.inactive {
		background: var(--md-sys-color-surface-container-highest);
		color: var(--md-sys-color-on-surface-variant);
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		gap: var(--md-sys-spacing-xs);
	}

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
	@media (max-width: 900px) {
		.create-grid {
			grid-template-columns: 1fr;
		}

		.pricing-row {
			grid-template-columns: 1fr;
		}
	}
</style>
