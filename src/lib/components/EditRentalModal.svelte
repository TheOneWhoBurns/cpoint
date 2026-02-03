<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/radio/radio.js';
	import '@material/web/checkbox/checkbox.js';
	import GuideSelector from '$lib/components/GuideSelector.svelte';

	interface RentalItem {
		type: string;
		itemId?: number;
		categoryId?: number;
		code?: string;
		name: string;
		quantity?: number;
	}

	interface Customer {
		name?: string;
		hotel?: string;
		phone?: string;
		id?: string;
	}

	interface TrackedItem {
		id: number;
		code: string;
		productTypeId: number | null;
		status: string | null;
	}

	interface Category {
		id: number;
		name: string;
		trackingType: string;
		availableQuantity?: number | null;
	}

	interface Guide {
		id: number;
		name: string;
		inCooldown?: boolean;
		minutesRemaining?: number;
	}

	interface Rental {
		id: number;
		items: RentalItem[];
		customer?: Customer;
		startedAt: string;
		pricing?: { type?: string; hourly?: number; fullDay?: number };
		returnNotes?: string;
		guideId?: number | null;
		quantity?: number;
	}

	let {
		open = $bindable(false),
		rental,
		trackedItems = [],
		categories = [],
		guides = [],
		onSave = () => {},
		onCancel = () => {},
		onVerifyPin = async (guideId: number, pin: string) => false
	}: {
		open: boolean;
		rental: Rental;
		trackedItems: TrackedItem[];
		categories: Category[];
		guides: Guide[];
		onSave: (data: any) => Promise<void> | void;
		onCancel: () => void;
		onVerifyPin: (guideId: number, pin: string) => Promise<boolean>;
	} = $props();

	let customerName = $state('');
	let customerHotel = $state('');
	let customerPhone = $state('');
	let customerId = $state('');
	let rentalType = $state('hourly');
	let notes = $state('');
	let loading = $state(false);
	let error = $state('');

	// Item editing state
	let editItems = $state<RentalItem[]>([]);
	let selectedGuideId = $state<number | null>(null);
	let searchQueries = $state<Record<number, string>>({});
	let showAddItem = $state(false);
	let addItemType = $state<'tracked' | 'generic'>('tracked');
	let addCategoryId = $state<number | null>(null);
	let addGenericQuantity = $state(1);

	// Initialize form when modal opens
	$effect(() => {
		if (open && rental) {
			const customer = rental.customer as Customer;
			customerName = customer?.name || '';
			customerHotel = customer?.hotel || '';
			customerPhone = customer?.phone || '';
			customerId = customer?.id || '';
			rentalType = rental.pricing?.type || 'hourly';
			notes = rental.returnNotes || '';
			editItems = [...(rental.items as RentalItem[])];
			selectedGuideId = rental.guideId ?? null;
			searchQueries = {};
			showAddItem = false;
			error = '';
		}
	});

	function resetForm() {
		customerName = '';
		customerHotel = '';
		customerPhone = '';
		customerId = '';
		rentalType = 'hourly';
		notes = '';
		editItems = [];
		selectedGuideId = null;
		searchQueries = {};
		showAddItem = false;
		error = '';
	}

	async function handleSave() {
		if (!customerName.trim()) {
			error = 'Customer name is required';
			return;
		}

		if (editItems.length === 0) {
			error = 'At least one item required';
			return;
		}

		loading = true;
		error = '';

		const updateData = {
			customer: {
				name: customerName.trim(),
				hotel: customerHotel.trim(),
				phone: customerPhone.trim(),
				id: customerId.trim()
			},
			rentalType,
			notes: notes.trim(),
			items: editItems,
			guideId: selectedGuideId
		};

		try {
			await onSave(updateData);
			resetForm();
			open = false;
		} catch (err) {
			error = (err as Error)?.message ?? 'Failed to save changes';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		onCancel();
		resetForm();
		open = false;
	}

	function getElapsedTime(startedAt: string): string {
		const start = new Date(startedAt);
		const now = new Date();
		const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
		const hours = Math.floor(diff / 60);
		const mins = diff % 60;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}

	function removeItem(index: number) {
		editItems = editItems.filter((_, i) => i !== index);
	}

	// Get tracked items available for a category (available + already in this rental)
	function getAvailableTrackedItems(categoryId: number) {
		const currentRentalItemIds = new Set(editItems.filter(i => i.type === 'tracked' && i.itemId).map(i => i.itemId));
		const items = trackedItems.filter(t =>
			t.productTypeId === categoryId &&
			(t.status === 'available' || currentRentalItemIds.has(t.id))
		);
		const query = searchQueries[categoryId];
		if (!query) return items;
		return items.filter(t => t.code.toLowerCase().includes(query.toLowerCase()));
	}

	function getCategoryName(categoryId: number) {
		return categories.find(c => c.id === categoryId)?.name || `Category ${categoryId}`;
	}

	function getCategoryAvailability(categoryId: number) {
		const cat = categories.find(c => c.id === categoryId);
		return cat?.availableQuantity ?? 0;
	}

	function addTrackedItem(item: TrackedItem) {
		if (editItems.some(i => i.type === 'tracked' && i.itemId === item.id)) return;
		const catId = item.productTypeId ?? undefined;
		editItems = [...editItems, {
			type: 'tracked',
			itemId: item.id,
			categoryId: catId,
			code: item.code,
			name: getCategoryName(item.productTypeId ?? 0)
		}];
	}

	function addGenericItem() {
		if (!addCategoryId || addGenericQuantity < 1) return;
		// Check if already have this category as generic
		const existingIdx = editItems.findIndex(i => i.type === 'generic' && i.categoryId === addCategoryId);
		if (existingIdx >= 0) {
			editItems = editItems.map((item, i) =>
				i === existingIdx ? { ...item, quantity: (item.quantity || 0) + addGenericQuantity } : item
			);
		} else {
			editItems = [...editItems, {
				type: 'generic',
				categoryId: addCategoryId,
				name: getCategoryName(addCategoryId),
				quantity: addGenericQuantity
			}];
		}
		addCategoryId = null;
		addGenericQuantity = 1;
		showAddItem = false;
	}

	// Categories that have tracked items
	const trackedCategories = $derived(
		[...new Set(trackedItems.filter(t => t.productTypeId !== null).map(t => t.productTypeId as number))]
			.map(id => ({ id, name: getCategoryName(id) }))
	);

	// Categories that are generic type
	const genericCategories = $derived(
		categories.filter(c => c.trackingType === 'generic')
	);

	const hasHourlyOption = $derived(!!rental?.pricing?.hourly);
	const hasFullDayOption = $derived(!!rental?.pricing?.fullDay);
</script>

{#if open && rental}
	<div class="modal-overlay" onclick={handleCancel}>
		<div class="modal-content large" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-rental-title">
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">edit</span>
					<h2 class="md-headline-small" id="edit-rental-title">Edit Rental</h2>
				</div>
				<md-icon-button onclick={handleCancel} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>

			<div class="modal-body">
				<!-- Rental Info Card -->
				<div class="rental-info-card">
					<div class="info-row">
						<span class="material-symbols-rounded icon-sm">schedule</span>
						<span class="md-body-medium">Started {new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						<span class="elapsed-badge">{getElapsedTime(rental.startedAt)}</span>
					</div>
				</div>

				<!-- Customer Info -->
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">person</span>
						<span class="md-title-small">Customer Information</span>
					</label>
					<div class="customer-form-grid">
						<md-outlined-text-field
							label="Name *"
							value={customerName}
							oninput={(e: Event) => customerName = (e.target as HTMLInputElement).value}
							disabled={loading}
						>
							<span class="material-symbols-rounded" slot="leading-icon">badge</span>
						</md-outlined-text-field>
						<md-outlined-text-field
							label="Hotel"
							value={customerHotel}
							oninput={(e: Event) => customerHotel = (e.target as HTMLInputElement).value}
							disabled={loading}
						>
							<span class="material-symbols-rounded" slot="leading-icon">hotel</span>
						</md-outlined-text-field>
						<md-outlined-text-field
							label="Phone"
							type="tel"
							value={customerPhone}
							oninput={(e: Event) => customerPhone = (e.target as HTMLInputElement).value}
							disabled={loading}
						>
							<span class="material-symbols-rounded" slot="leading-icon">phone</span>
						</md-outlined-text-field>
						<md-outlined-text-field
							label="Customer ID"
							value={customerId}
							oninput={(e: Event) => customerId = (e.target as HTMLInputElement).value}
							disabled={loading}
						>
							<span class="material-symbols-rounded" slot="leading-icon">id_card</span>
						</md-outlined-text-field>
					</div>
				</div>

				<!-- Equipment Items -->
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">inventory_2</span>
						<span class="md-title-small">Equipment</span>
						<span class="count-badge md-label-small">{editItems.length}</span>
					</label>

					{#if editItems.length > 0}
						<div class="items-list">
							{#each editItems as item, index}
								<div class="item-row">
									<span class="material-symbols-rounded icon-sm">
										{item.type === 'tracked' ? 'qr_code_2' : 'inventory_2'}
									</span>
									<div class="item-details">
										<span class="md-body-medium">{item.name}</span>
										{#if item.code}
											<span class="md-label-small item-code">{item.code}</span>
										{/if}
										{#if item.type === 'generic' && item.quantity}
											<span class="md-label-small item-qty">x{item.quantity}</span>
										{/if}
									</div>
									<md-icon-button onclick={() => removeItem(index)} disabled={loading} aria-label="Remove item">
										<span class="material-symbols-rounded remove-icon">close</span>
									</md-icon-button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-items">
							<span class="material-symbols-rounded">warning</span>
							<span class="md-body-small">No items - add at least one</span>
						</div>
					{/if}

					<!-- Add Item Section -->
					{#if !showAddItem}
						<md-outlined-button onclick={() => { showAddItem = true; addItemType = 'tracked'; addCategoryId = null; }} disabled={loading}>
							<span class="material-symbols-rounded" slot="icon">add</span>
							Add Item
						</md-outlined-button>
					{:else}
						<div class="add-item-card">
							<div class="add-item-header">
								<span class="md-title-small">Add Item</span>
								<md-icon-button onclick={() => { showAddItem = false; }} aria-label="Cancel add">
									<span class="material-symbols-rounded">close</span>
								</md-icon-button>
							</div>

							<!-- Type toggle -->
							<div class="add-type-toggle">
								<button class="toggle-btn" class:active={addItemType === 'tracked'} onclick={() => { addItemType = 'tracked'; addCategoryId = null; }}>
									<span class="material-symbols-rounded icon-sm">qr_code_2</span>
									Tracked
								</button>
								<button class="toggle-btn" class:active={addItemType === 'generic'} onclick={() => { addItemType = 'generic'; addCategoryId = null; }}>
									<span class="material-symbols-rounded icon-sm">inventory_2</span>
									Generic
								</button>
							</div>

							{#if addItemType === 'tracked'}
								<!-- Category selector for tracked items -->
								{#each trackedCategories as cat}
									{@const available = getAvailableTrackedItems(cat.id)}
									{@const alreadyInRental = editItems.filter(i => i.type === 'tracked' && i.itemId).map(i => i.itemId)}
									{#if available.length > 0}
										<div class="add-category-section">
											<div class="add-category-header">
												<span class="md-body-medium">{cat.name}</span>
											</div>
											<input
												type="text"
												placeholder="Search by code..."
												value={searchQueries[cat.id] || ''}
												oninput={(e) => searchQueries[cat.id] = e.currentTarget.value}
												class="search-input"
											/>
											<div class="tracked-items-grid">
												{#each available as avail}
													{@const isInRental = alreadyInRental.includes(avail.id)}
													<button
														class="tracked-item-btn"
														class:selected={isInRental}
														onclick={() => {
															if (!isInRental) addTrackedItem(avail);
														}}
														disabled={isInRental || loading}
														aria-label="{avail.code} {isInRental ? 'already in rental' : 'add to rental'}"
													>
														<span class="material-symbols-rounded" aria-hidden="true">{isInRental ? 'check_circle' : 'add_circle_outline'}</span>
														<span class="md-label-large">{avail.code}</span>
													</button>
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							{:else}
								<!-- Generic item selector -->
								<select class="form-select" bind:value={addCategoryId} disabled={loading}>
									<option value={null}>Choose a category...</option>
									{#each genericCategories as cat}
										{@const currentInRental = editItems.find(i => i.type === 'generic' && i.categoryId === cat.id)?.quantity || 0}
										{@const totalAvailable = (cat.availableQuantity ?? 0) + currentInRental}
										<option value={cat.id}>
											{cat.name} ({totalAvailable} available)
										</option>
									{/each}
								</select>
								{#if addCategoryId}
									<div class="generic-qty-row">
										<span class="md-body-medium">Quantity:</span>
										<div class="quantity-control-sm">
											<button class="qty-btn-sm" onclick={() => addGenericQuantity = Math.max(1, addGenericQuantity - 1)} disabled={loading || addGenericQuantity <= 1} aria-label="Decrease">
												<span class="material-symbols-rounded">remove</span>
											</button>
											<span class="md-title-medium">{addGenericQuantity}</span>
											<button class="qty-btn-sm" onclick={() => addGenericQuantity++} disabled={loading} aria-label="Increase">
												<span class="material-symbols-rounded">add</span>
											</button>
										</div>
										<md-filled-tonal-button onclick={addGenericItem} disabled={loading}>
											<span class="material-symbols-rounded" slot="icon">add</span>
											Add
										</md-filled-tonal-button>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>

				<!-- Guide Assignment -->
				{#if guides.length > 0}
					<div class="form-section">
						<GuideSelector
							{guides}
							bind:selectedGuideId
							{loading}
							onVerifyPin={onVerifyPin}
						/>
					</div>
				{/if}

				<!-- Rental Type -->
				{#if hasHourlyOption && hasFullDayOption}
					<div class="form-section">
						<label class="form-label">
							<span class="material-symbols-rounded">schedule</span>
							<span class="md-title-small">Rental Type</span>
						</label>
						<div class="rental-type-selector">
							<label class="type-option" class:selected={rentalType === 'hourly'}>
								<input type="radio" bind:group={rentalType} value="hourly" disabled={loading} />
								<span class="material-symbols-rounded">timer</span>
								<div class="type-info">
									<span class="md-body-medium">Hourly</span>
									<span class="md-label-medium">${rental.pricing?.hourly}/hr</span>
								</div>
							</label>
							<label class="type-option" class:selected={rentalType === 'fullDay'}>
								<input type="radio" bind:group={rentalType} value="fullDay" disabled={loading} />
								<span class="material-symbols-rounded">wb_sunny</span>
								<div class="type-info">
									<span class="md-body-medium">Full Day</span>
									<span class="md-label-medium">${rental.pricing?.fullDay}</span>
								</div>
							</label>
						</div>
					</div>
				{/if}

				<!-- Notes -->
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">note</span>
						<span class="md-title-small">Notes</span>
					</label>
					<textarea
						bind:value={notes}
						disabled={loading}
						placeholder="Add any notes about this rental..."
						class="notes-textarea"
					></textarea>
				</div>

				{#if error}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{error}</span>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<md-outlined-button onclick={handleCancel} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSave} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">save</span>
					Save Changes
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
		padding: var(--md-sys-spacing-md);
		animation: md-animate-fade-in 0.2s var(--md-sys-motion-easing-standard);
	}

	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		max-width: 550px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: md-animate-scale-in 0.3s var(--md-sys-motion-easing-emphasized-decelerate);
	}

	.modal-content.large {
		max-width: 700px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface);
		z-index: 1;
		flex-shrink: 0;
	}

	.modal-title {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.modal-title .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-primary);
	}

	.modal-title h2 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.modal-body {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.modal-footer {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		justify-content: flex-end;
		padding: var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface);
		flex-shrink: 0;
	}

	/* Rental Info Card */
	.rental-info-card {
		background: var(--md-sys-color-tertiary-container);
		padding: var(--md-sys-spacing-md);
		border-radius: var(--md-sys-shape-corner-medium);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.elapsed-badge {
		margin-left: auto;
		padding: 2px 8px;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-tertiary);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 500;
	}

	/* Form Section */
	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.form-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface);
	}

	.form-label .material-symbols-rounded {
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.count-badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: 2px 8px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Customer Form Grid */
	.customer-form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--md-sys-spacing-md);
	}

	.customer-form-grid md-outlined-text-field {
		width: 100%;
	}

	/* Items List */
	.items-list {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.item-row .icon-sm {
		color: var(--md-sys-color-primary);
	}

	.item-details {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.item-code {
		padding: 2px 6px;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.item-qty {
		padding: 2px 6px;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.remove-icon {
		font-size: 18px;
		color: var(--md-sys-color-error);
	}

	.empty-items {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	/* Add Item Card */
	.add-item-card {
		background: var(--md-sys-color-surface-container-low);
		border: 2px dashed var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.add-item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.add-type-toggle {
		display: flex;
		gap: var(--md-sys-spacing-sm);
	}

	.toggle-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
		cursor: pointer;
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-label-large);
		transition: all 0.15s ease;
	}

	.toggle-btn:hover {
		background: var(--md-sys-color-surface-container);
	}

	.toggle-btn.active {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}

	.add-category-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.add-category-header {
		color: var(--md-sys-color-on-surface-variant);
	}

	.search-input {
		width: 100%;
		padding: var(--md-sys-spacing-sm);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-body-medium);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
	}

	.tracked-items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--md-sys-spacing-sm);
		max-height: 150px;
		overflow-y: auto;
	}

	.tracked-item-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		min-height: 40px;
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
		cursor: pointer;
		transition: all 0.15s ease;
		color: var(--md-sys-color-on-surface);
	}

	.tracked-item-btn:hover:not(:disabled) {
		background: var(--md-sys-color-surface-container);
	}

	.tracked-item-btn.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}

	.tracked-item-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tracked-item-btn .material-symbols-rounded {
		font-size: 18px;
		flex-shrink: 0;
	}

	.form-select {
		width: 100%;
		padding: var(--md-sys-spacing-md);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-body-large);
		cursor: pointer;
	}

	.form-select:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
		border-width: 2px;
	}

	.generic-qty-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
	}

	.quantity-control-sm {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.qty-btn-sm {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-surface-container-high);
		border: none;
		border-radius: var(--md-sys-shape-corner-full);
		color: var(--md-sys-color-on-surface);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.qty-btn-sm:hover:not(:disabled) {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.qty-btn-sm:disabled {
		opacity: 0.38;
		cursor: not-allowed;
	}

	.qty-btn-sm .material-symbols-rounded {
		font-size: 20px;
	}

	/* Rental Type Selector */
	.rental-type-selector {
		display: flex;
		gap: var(--md-sys-spacing-md);
	}

	.type-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.type-option:hover {
		background: var(--md-sys-color-surface-container);
	}

	.type-option.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
	}

	.type-option input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.type-option:focus-within {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: 2px;
	}

	.type-option .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
	}

	.type-info {
		display: flex;
		flex-direction: column;
	}

	.type-info .md-label-medium {
		color: var(--md-sys-color-primary);
	}

	/* Notes Textarea */
	.notes-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--md-sys-spacing-md);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font-family: inherit;
		font: var(--md-sys-typescale-body-medium);
		resize: vertical;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	.notes-textarea:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
		border-width: 2px;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-banner .material-symbols-rounded {
		font-size: 20px;
	}

	/* Icon Sizes */
	.icon-sm {
		font-size: 18px;
	}

	/* Animations */
	@keyframes md-animate-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes md-animate-scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Responsive */
	@media (max-width: 480px) {
		.customer-form-grid {
			grid-template-columns: 1fr;
		}

		.rental-type-selector {
			flex-direction: column;
		}

		.generic-qty-row {
			flex-wrap: wrap;
		}
	}
</style>
