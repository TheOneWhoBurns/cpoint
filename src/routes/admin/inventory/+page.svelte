<script lang="ts">
	let { data } = $props();

	function getCategoryName(id: number) {
		return data.categories.find(c => c.id === id)?.name || 'Unknown';
	}

	const trackedCategories = $derived(data.categories.filter(c => c.trackingType === 'tracked'));
	const genericCategories = $derived(data.categories.filter(c => c.trackingType === 'generic'));

	// Stats
	const totalTrackedItems = $derived(data.trackedItems.length);
	const availableTrackedItems = $derived(data.trackedItems.filter(i => i.status === 'available').length);
	const rentedTrackedItems = $derived(data.trackedItems.filter(i => i.status === 'rented').length);
	const totalGenericItems = $derived(genericCategories.reduce((sum, c) => sum + (c.totalQuantity ?? 0), 0));
	const availableGenericItems = $derived(genericCategories.reduce((sum, c) => sum + (c.availableQuantity ?? 0), 0));
</script>

<div class="inventory-page">
	<!-- Stats Overview -->
	<section class="stats-grid">
		<div class="stat-card">
			<span class="material-symbols-rounded stat-icon">qr_code_2</span>
			<div class="stat-content">
				<span class="stat-value md-headline-medium">{totalTrackedItems}</span>
				<span class="stat-label md-label-medium">Tracked Items</span>
			</div>
			<div class="stat-breakdown">
				<span class="stat-detail available">{availableTrackedItems} available</span>
				<span class="stat-detail rented">{rentedTrackedItems} rented</span>
			</div>
		</div>

		<div class="stat-card">
			<span class="material-symbols-rounded stat-icon">inventory</span>
			<div class="stat-content">
				<span class="stat-value md-headline-medium">{totalGenericItems}</span>
				<span class="stat-label md-label-medium">Generic Items</span>
			</div>
			<div class="stat-breakdown">
				<span class="stat-detail available">{availableGenericItems} available</span>
				<span class="stat-detail rented">{totalGenericItems - availableGenericItems} rented</span>
			</div>
		</div>

		<div class="stat-card">
			<span class="material-symbols-rounded stat-icon">folder</span>
			<div class="stat-content">
				<span class="stat-value md-headline-medium">{data.categories.length}</span>
				<span class="stat-label md-label-medium">Categories</span>
			</div>
			<div class="stat-breakdown">
				<span class="stat-detail">{trackedCategories.length} tracked</span>
				<span class="stat-detail">{genericCategories.length} generic</span>
			</div>
		</div>
	</section>

	<!-- Info Banner -->
	<div class="info-banner">
		<span class="material-symbols-rounded">info</span>
		<p class="md-body-medium">This is a read-only view. Register new items in the <a href="/admin/equipment">Equipment</a> section.</p>
	</div>

	<!-- Tracked Items -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">qr_code_2</span>
			<h2 class="md-title-large">Tracked Items</h2>
			<span class="badge md-label-medium">{data.trackedItems.length}</span>
		</div>

		{#if data.trackedItems.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">inventory_2</span>
				<p class="md-body-medium">No tracked items registered</p>
				<a href="/admin/equipment" class="md-body-small">Add items in Equipment section</a>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Category</th>
							<th>Code</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.trackedItems as item}
							<tr>
								<td>
									<div class="cell-with-icon">
										<span class="material-symbols-rounded icon-sm">handyman</span>
										<span class="md-body-medium">{getCategoryName(item.productTypeId ?? 0)}</span>
									</div>
								</td>
								<td>
									<code class="item-code">{item.code}</code>
								</td>
								<td>
									<span class="status-badge" class:available={item.status === 'available'} class:rented={item.status === 'rented'}>
										<span class="material-symbols-rounded icon-xs">
											{item.status === 'available' ? 'check_circle' : 'pending'}
										</span>
										{item.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Generic Items -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">inventory</span>
			<h2 class="md-title-large">Generic Items</h2>
			<span class="badge md-label-medium">{genericCategories.length}</span>
		</div>

		{#if genericCategories.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">category</span>
				<p class="md-body-medium">No generic categories</p>
				<a href="/admin/equipment" class="md-body-small">Create categories in Equipment section</a>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Category</th>
							<th>Available</th>
							<th>Total</th>
							<th>Availability</th>
						</tr>
					</thead>
					<tbody>
						{#each genericCategories as cat}
							{@const available = cat.availableQuantity ?? 0}
							{@const total = cat.totalQuantity ?? 0}
							{@const percentage = total > 0 ? Math.round((available / total) * 100) : 0}
							<tr>
								<td>
									<div class="cell-with-icon">
										<span class="material-symbols-rounded icon-sm">inventory_2</span>
										<span class="md-body-medium">{cat.name}</span>
									</div>
								</td>
								<td>
									<span class="quantity-value" class:low={available === 0} class:warning={available > 0 && available < total * 0.25}>
										{available}
									</span>
								</td>
								<td>
									<span class="md-body-medium">{total}</span>
								</td>
								<td>
									<div class="progress-container">
										<div class="progress-bar">
											<div
												class="progress-fill"
												class:low={percentage === 0}
												class:warning={percentage > 0 && percentage < 25}
												class:good={percentage >= 25}
												style="width: {percentage}%"
											></div>
										</div>
										<span class="md-label-small">{percentage}%</span>
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

<style>
	.inventory-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 1000px;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.stat-card {
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-large);
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.stat-icon {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		color: var(--md-sys-color-on-surface);
	}

	.stat-label {
		color: var(--md-sys-color-on-surface-variant);
	}

	.stat-breakdown {
		display: flex;
		gap: var(--md-sys-spacing-md);
		margin-top: var(--md-sys-spacing-xs);
	}

	.stat-detail {
		font: var(--md-sys-typescale-label-small);
		color: var(--md-sys-color-on-surface-variant);
	}

	.stat-detail.available {
		color: var(--md-sys-color-success);
	}

	.stat-detail.rented {
		color: var(--md-sys-color-warning);
	}

	/* Info Banner */
	.info-banner {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.info-banner p {
		margin: 0;
	}

	.info-banner a {
		color: var(--md-sys-color-on-tertiary-container);
		font-weight: 500;
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

	/* Badge */
	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
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

	.icon-xs {
		font-size: 14px;
	}

	/* Item Code */
	.item-code {
		font-family: monospace;
		padding: 4px 8px;
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-extra-small);
		font-size: 0.875rem;
	}

	/* Status Badge */
	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
		text-transform: capitalize;
	}

	.status-badge.available {
		background: var(--md-sys-color-success-container);
		color: var(--md-sys-color-on-success-container);
	}

	.status-badge.rented {
		background: var(--md-sys-color-warning-container);
		color: var(--md-sys-color-on-warning-container);
	}

	/* Quantity Value */
	.quantity-value {
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-success);
	}

	.quantity-value.low {
		color: var(--md-sys-color-error);
	}

	.quantity-value.warning {
		color: var(--md-sys-color-warning);
	}

	/* Progress Bar */
	.progress-container {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background: var(--md-sys-color-surface-container-highest);
		border-radius: var(--md-sys-shape-corner-full);
		overflow: hidden;
		max-width: 100px;
	}

	.progress-fill {
		height: 100%;
		border-radius: var(--md-sys-shape-corner-full);
		transition: width var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
	}

	.progress-fill.good {
		background: var(--md-sys-color-success);
	}

	.progress-fill.warning {
		background: var(--md-sys-color-warning);
	}

	.progress-fill.low {
		background: var(--md-sys-color-error);
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

	.empty-state a {
		color: var(--md-sys-color-primary);
		text-decoration: none;
	}

	.empty-state a:hover {
		text-decoration: underline;
	}
</style>
