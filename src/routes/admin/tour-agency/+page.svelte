<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';
	import '@material/web/checkbox/checkbox.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let productName = $state('');
	let productPrice = $state('');
	let requiresGuide = $state(false);
	let productInfo = $state('');
	let newLink = $state('');
	let multimediaLinks = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');

	let editingProduct = $state<any>(null);
	let editName = $state('');
	let editPrice = $state('');
	let editRequiresGuide = $state(false);
	let editInfo = $state('');
	let editNewLink = $state('');
	let editMultimediaLinks = $state<string[]>([]);

	let confirmDeleteProduct = $state(false);
	let pendingDeleteProductId = $state<number | null>(null);

	function addLink() {
		if (newLink.trim() && !multimediaLinks.includes(newLink.trim())) {
			multimediaLinks = [...multimediaLinks, newLink.trim()];
			newLink = '';
		}
	}

	function removeLink(link: string) {
		multimediaLinks = multimediaLinks.filter(l => l !== link);
	}

	function addEditLink() {
		if (editNewLink.trim() && !editMultimediaLinks.includes(editNewLink.trim())) {
			editMultimediaLinks = [...editMultimediaLinks, editNewLink.trim()];
			editNewLink = '';
		}
	}

	function removeEditLink(link: string) {
		editMultimediaLinks = editMultimediaLinks.filter(l => l !== link);
	}

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

		loading = true;
		error = '';

		const res = await fetch('/api/tour-agency', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: productName,
				requiresGuide,
				price,
				info: productInfo || null,
				multimediaLinks: multimediaLinks.length > 0 ? multimediaLinks : null
			})
		});

		if (res.ok) {
			productName = '';
			productPrice = '';
			requiresGuide = false;
			productInfo = '';
			newLink = '';
			multimediaLinks = [];
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create product';
		}
		loading = false;
	}

	function startEdit(product: any) {
		editingProduct = product;
		editName = product.name;
		editPrice = (product.price / 100).toFixed(2);
		editRequiresGuide = product.requiresGuide ?? false;
		editInfo = product.info || '';
		editMultimediaLinks = product.multimediaLinks ? [...product.multimediaLinks] : [];
		editNewLink = '';
	}

	function cancelEdit() {
		editingProduct = null;
	}

	async function saveEdit() {
		if (!editingProduct) return;
		loading = true;
		error = '';

		const res = await fetch('/api/tour-agency', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: editingProduct.id,
				name: editName,
				requiresGuide: editRequiresGuide,
				price: parseFloat(editPrice) || 0,
				info: editInfo || null,
				multimediaLinks: editMultimediaLinks.length > 0 ? editMultimediaLinks : null
			})
		});

		if (res.ok) {
			editingProduct = null;
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	async function toggleActive(id: number, isActive: boolean | null) {
		loading = true;
		error = '';

		const res = await fetch('/api/tour-agency', {
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

		const res = await fetch('/api/tour-agency', {
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

<div class="tour-agency-page">
	<!-- Add Product Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">tour</span>
			<h2 class="md-title-large">Add Tour Product</h2>
		</div>
		<div class="card-content">
			<div class="form-grid">
				<md-outlined-text-field
					label="Tour Name"
					placeholder="e.g., Snorkeling Trip"
					value={productName}
					oninput={(e: Event) => productName = (e.target as HTMLInputElement).value}
					disabled={loading}
				>
					<span class="material-symbols-rounded" slot="leading-icon">label</span>
				</md-outlined-text-field>

				<md-outlined-text-field
					label="Price per Person"
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
			</div>

			<md-outlined-text-field
				label="Tour Info / Description"
				type="textarea"
				rows="3"
				placeholder="Enter tour details, what's included, etc."
				value={productInfo}
				oninput={(e: Event) => productInfo = (e.target as HTMLInputElement).value}
				disabled={loading}
				style="width: 100%;"
			>
				<span class="material-symbols-rounded" slot="leading-icon">info</span>
			</md-outlined-text-field>

			<div class="links-section">
				<span class="md-label-medium links-label">Multimedia Links (Instagram, etc.)</span>
				<div class="link-input-row">
					<md-outlined-text-field
						label="Add URL"
						placeholder="https://instagram.com/..."
						value={newLink}
						oninput={(e: Event) => newLink = (e.target as HTMLInputElement).value}
						onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
						disabled={loading}
						style="flex: 1;"
					>
						<span class="material-symbols-rounded" slot="leading-icon">link</span>
					</md-outlined-text-field>
					<md-filled-button onclick={addLink} disabled={loading || !newLink.trim()}>
						<span class="material-symbols-rounded" slot="icon">add</span>
						Add
					</md-filled-button>
				</div>
				{#if multimediaLinks.length > 0}
					<div class="links-list">
						{#each multimediaLinks as link}
							<div class="link-chip">
								<span class="material-symbols-rounded">link</span>
								<span class="link-text">{link}</span>
								<md-icon-button onclick={() => removeLink(link)} disabled={loading}>
									<span class="material-symbols-rounded">close</span>
								</md-icon-button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<label class="guide-checkbox">
				<md-checkbox
					checked={requiresGuide}
					onchange={(e: Event) => requiresGuide = (e.target as HTMLInputElement).checked}
					disabled={loading}
				></md-checkbox>
				<span class="material-symbols-rounded">hiking</span>
				<span class="md-body-medium">Requires Guide</span>
			</label>

			{#if error}
				<div class="error-message">
					<span class="material-symbols-rounded">error</span>
					<span class="md-body-medium">{error}</span>
				</div>
			{/if}

			<div class="form-actions">
				<md-filled-button onclick={createProduct} disabled={loading || !productName}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					Add Tour Product
				</md-filled-button>
			</div>
		</div>
	</section>

	<!-- Products List -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">tour</span>
			<h2 class="md-title-large">Tour Products</h2>
			<span class="badge md-label-medium">{data.tourProducts.length}</span>
		</div>

		{#if data.tourProducts.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">tour</span>
				<p class="md-body-medium">No tour products added yet</p>
				<p class="md-body-small">Add your first tour product above</p>
			</div>
		{:else}
			<div class="products-list">
				{#each data.tourProducts as product}
					<div class="product-card" class:inactive={!product.isActive}>
						{#if editingProduct?.id === product.id}
							<div class="edit-form">
								<div class="form-grid">
									<md-outlined-text-field
										label="Tour Name"
										value={editName}
										oninput={(e: Event) => editName = (e.target as HTMLInputElement).value}
										disabled={loading}
									>
										<span class="material-symbols-rounded" slot="leading-icon">label</span>
									</md-outlined-text-field>
									<md-outlined-text-field
										label="Price per Person"
										type="number"
										step="0.01"
										min="0"
										value={editPrice}
										oninput={(e: Event) => editPrice = (e.target as HTMLInputElement).value}
										disabled={loading}
										prefix-text="$"
									>
										<span class="material-symbols-rounded" slot="leading-icon">payments</span>
									</md-outlined-text-field>
								</div>
								<md-outlined-text-field
									label="Tour Info / Description"
									type="textarea"
									rows="3"
									value={editInfo}
									oninput={(e: Event) => editInfo = (e.target as HTMLInputElement).value}
									disabled={loading}
									style="width: 100%;"
								>
									<span class="material-symbols-rounded" slot="leading-icon">info</span>
								</md-outlined-text-field>
								<div class="links-section">
									<span class="md-label-medium links-label">Multimedia Links</span>
									<div class="link-input-row">
										<md-outlined-text-field
											label="Add URL"
											placeholder="https://instagram.com/..."
											value={editNewLink}
											oninput={(e: Event) => editNewLink = (e.target as HTMLInputElement).value}
											onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addEditLink(); } }}
											disabled={loading}
											style="flex: 1;"
										>
											<span class="material-symbols-rounded" slot="leading-icon">link</span>
										</md-outlined-text-field>
										<md-filled-button onclick={addEditLink} disabled={loading || !editNewLink.trim()}>
											<span class="material-symbols-rounded" slot="icon">add</span>
											Add
										</md-filled-button>
									</div>
									{#if editMultimediaLinks.length > 0}
										<div class="links-list">
											{#each editMultimediaLinks as link}
												<div class="link-chip">
													<span class="material-symbols-rounded">link</span>
													<span class="link-text">{link}</span>
													<md-icon-button onclick={() => removeEditLink(link)} disabled={loading}>
														<span class="material-symbols-rounded">close</span>
													</md-icon-button>
												</div>
											{/each}
										</div>
									{/if}
								</div>
								<label class="guide-checkbox">
									<md-checkbox
										checked={editRequiresGuide}
										onchange={(e: Event) => editRequiresGuide = (e.target as HTMLInputElement).checked}
										disabled={loading}
									></md-checkbox>
									<span class="material-symbols-rounded">hiking</span>
									<span class="md-body-medium">Requires Guide</span>
								</label>
								<div class="edit-actions">
									<md-outlined-button onclick={cancelEdit} disabled={loading}>Cancel</md-outlined-button>
									<md-filled-button onclick={saveEdit} disabled={loading || !editName.trim()}>
										<span class="material-symbols-rounded" slot="icon">save</span>
										Save
									</md-filled-button>
								</div>
							</div>
						{:else}
							<div class="product-header">
								<div class="product-cell">
									<span class="material-symbols-rounded product-icon">tour</span>
									<span class="md-title-medium product-name">{product.name}</span>
								</div>
								<span class="price-value">${(product.price / 100).toFixed(2)}/person</span>
							</div>
							{#if product.info}
								<p class="product-info md-body-medium">{product.info}</p>
							{/if}
							{#if product.multimediaLinks && product.multimediaLinks.length > 0}
								<div class="product-links">
									{#each product.multimediaLinks as link}
										<a href={link} target="_blank" rel="noopener noreferrer" class="media-link">
											<span class="material-symbols-rounded">{link.includes('instagram') ? 'photo_camera' : 'link'}</span>
											<span>{link.includes('instagram') ? 'Instagram' : 'Link'}</span>
										</a>
									{/each}
								</div>
							{/if}
							<div class="product-meta">
								{#if product.requiresGuide}
									<span class="guide-badge">
										<span class="material-symbols-rounded icon-sm">hiking</span>
										Guide Required
									</span>
								{/if}
								<label class="switch-label">
									<md-switch
										selected={product.isActive}
										onchange={() => toggleActive(product.id, product.isActive)}
										disabled={loading}
										aria-label="Toggle product status"
									></md-switch>
									<span class="md-body-small">{product.isActive ? 'Active' : 'Inactive'}</span>
								</label>
							</div>
							<div class="product-actions">
								<md-icon-button onclick={() => startEdit(product)} disabled={loading} aria-label="Edit product">
									<span class="material-symbols-rounded">edit</span>
								</md-icon-button>
								<md-icon-button onclick={() => promptDeleteProduct(product.id)} disabled={loading} aria-label="Delete product">
									<span class="material-symbols-rounded delete-icon">delete</span>
								</md-icon-button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<ConfirmModal
	bind:open={confirmDeleteProduct}
	title="Delete Tour Product"
	message="Are you sure you want to delete this tour product? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteProduct}
/>

<style>
	.tour-agency-page {
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

	.guide-checkbox {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		cursor: pointer;
		padding: var(--md-sys-spacing-sm) 0;
	}

	.guide-checkbox .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--md-sys-spacing-sm);
	}

	/* Links Section */
	.links-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.links-label {
		color: var(--md-sys-color-on-surface-variant);
	}

	.link-input-row {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		align-items: flex-end;
	}

	.links-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--md-sys-spacing-sm);
	}

	.link-chip {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface-container);
		border-radius: var(--md-sys-shape-corner-small);
		border: 1px solid var(--md-sys-color-outline-variant);
	}

	.link-chip .material-symbols-rounded {
		font-size: 18px;
		color: var(--md-sys-color-primary);
	}

	.link-text {
		font: var(--md-sys-typescale-body-small);
		color: var(--md-sys-color-on-surface);
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* Products List */
	.products-list {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md);
	}

	.product-card {
		background: var(--md-sys-color-surface-container-low);
		border-radius: var(--md-sys-shape-corner-medium);
		border: 1px solid var(--md-sys-color-outline-variant);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		position: relative;
	}

	.product-card.inactive {
		opacity: 0.6;
	}

	.product-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	/* Product Cell */
	.product-cell {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.product-icon {
		font-size: 24px;
		color: var(--md-sys-color-primary);
	}

	.product-name {
		font-weight: 500;
		color: var(--md-sys-color-on-surface);
	}

	.product-info {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
		white-space: pre-wrap;
	}

	.product-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--md-sys-spacing-sm);
	}

	.media-link {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-small);
		text-decoration: none;
		font: var(--md-sys-typescale-label-medium);
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.media-link:hover {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	.media-link .material-symbols-rounded {
		font-size: 18px;
	}

	.product-meta {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		flex-wrap: wrap;
	}

	.product-actions {
		position: absolute;
		top: var(--md-sys-spacing-sm);
		right: var(--md-sys-spacing-sm);
		display: flex;
		gap: var(--md-sys-spacing-xs);
	}

	/* Price Value */
	.price-value {
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-primary);
	}

	/* Guide Badge */
	.guide-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-medium);
	}

	.icon-sm {
		font-size: 18px;
	}

	.switch-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	/* Delete Icon */
	.delete-icon {
		color: var(--md-sys-color-error);
	}

	/* Edit Form */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--md-sys-spacing-sm);
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
