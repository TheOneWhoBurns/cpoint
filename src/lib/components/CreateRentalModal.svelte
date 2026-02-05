<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/checkbox/checkbox.js';
	import { untrack } from 'svelte';
	import GuideSelector from './GuideSelector.svelte';

	type EquipmentItem = { type: string; itemId?: number; categoryId?: number; name: string; quantity?: number };
	type Pricing = { hourly?: number; fullDay?: number };

	let {
		open = $bindable(false),
		products,
		trackedItems,
		categories,
		guides,
		fromReservationId = $bindable<number | null>(null),
		prefillData = null as { productId?: number; customerName?: string; customerHotel?: string; customerPhone?: string; guideId?: number | null; trackedItems?: Record<number, number[]>; genericItems?: Record<number, boolean> } | null,
		loading = $bindable(false),
		onSubmit,
		onVerifyPin
	}: {
		open: boolean;
		products: any[];
		trackedItems: any[];
		categories: any[];
		guides: any[];
		fromReservationId?: number | null;
		prefillData?: any;
		loading?: boolean;
		onSubmit: (payload: any) => Promise<void>;
		onVerifyPin: (guideId: number, pin: string) => Promise<boolean>;
	} = $props();

	let selectedProductId = $state<number | null>(null);
	let selectedTrackedItems = $state<Record<number, number[]>>({});
	let includedGenericItems = $state<Record<number, boolean>>({});
	let customerName = $state('');
	let customerHotel = $state('');
	let customerPhone = $state('');
	let customerId = $state('');
	let rentalType = $state('hourly');
	let rentalQuantity = $state(1);
	let selectedGuideId = $state<number | null>(null);
	let error = $state('');
	let searchQueries = $state<Record<number, string>>({});

	const selectedProduct = $derived(selectedProductId ? products.find((p: any) => p.id === selectedProductId) : null);
	const productEquipment = $derived<EquipmentItem[]>(selectedProduct?.equipment as EquipmentItem[] ?? []);
	const productPricing = $derived<Pricing>(selectedProduct?.pricing as Pricing ?? {});
	const hasHourlyOption = $derived(!!productPricing.hourly);

	function getCategoryAvailability(categoryId: number) {
		const cat = categories.find((c: any) => c.id === categoryId);
		return cat?.availableQuantity ?? 0;
	}

	function getFilteredTrackedItems(categoryId: number) {
		const items = trackedItems.filter((t: any) => t.productTypeId === categoryId && t.status === 'available');
		const query = searchQueries[categoryId];
		if (!query) return items;
		return items.filter((t: any) => t.code.toLowerCase().includes(query.toLowerCase()));
	}

	function initProductForm(product: any) {
		if (!product) return;
		const equipment = (product.equipment as EquipmentItem[]) ?? [];
		const pricing = (product.pricing as Pricing) ?? {};
		selectedTrackedItems = {};
		includedGenericItems = {};
		searchQueries = {};
		rentalType = pricing.hourly ? 'hourly' : 'fullDay';
		for (const item of equipment) {
			if (item.type === 'tracked') {
				searchQueries[item.categoryId ?? 0] = '';
			} else if (item.type === 'generic') {
				const available = getCategoryAvailability(item.categoryId ?? 0);
				const needed = item.quantity ?? 1;
				includedGenericItems[item.categoryId ?? 0] = available >= needed;
			}
		}
	}

	$effect(() => {
		if (selectedProductId) {
			untrack(() => initProductForm(selectedProduct));
		}
	});

	$effect(() => {
		if (open && prefillData) {
			if (prefillData.productId) selectedProductId = prefillData.productId;
			if (prefillData.customerName) customerName = prefillData.customerName;
			if (prefillData.customerHotel) customerHotel = prefillData.customerHotel;
			if (prefillData.customerPhone) customerPhone = prefillData.customerPhone;
			if (prefillData.guideId !== undefined) selectedGuideId = prefillData.guideId;
			if (prefillData.trackedItems) {
				setTimeout(() => {
					selectedTrackedItems = { ...prefillData.trackedItems };
					if (prefillData.genericItems) includedGenericItems = { ...prefillData.genericItems };
				}, 100);
			}
		}
	});

	function resetForm() {
		selectedProductId = null;
		selectedTrackedItems = {};
		includedGenericItems = {};
		customerName = '';
		customerHotel = '';
		customerPhone = '';
		customerId = '';
		rentalType = 'hourly';
		rentalQuantity = 1;
		selectedGuideId = null;
		error = '';
		searchQueries = {};
		fromReservationId = null;
		open = false;
	}

	async function handleSubmit() {
		if (!selectedProductId) { error = 'Select a product'; return; }
		if (!customerName.trim()) { error = 'Customer name required'; return; }

		for (const item of productEquipment.filter(e => e.type === 'tracked')) {
			const selectedIds = selectedTrackedItems[item.categoryId ?? 0] || [];
			if (selectedIds.length !== rentalQuantity) {
				error = `Select ${rentalQuantity} items for ${item.name}`;
				return;
			}
		}

		error = '';
		const rentalItems = productEquipment.map(item => {
			if (item.type === 'tracked') {
				const selectedIds = selectedTrackedItems[item.categoryId ?? 0] || [];
				return selectedIds.map(selectedId => {
					const selected = trackedItems.find((t: any) => t.id === selectedId);
					return { type: 'tracked', itemId: selectedId, code: selected?.code, name: item.name, categoryId: item.categoryId };
				});
			}
			if (!includedGenericItems[item.categoryId ?? 0]) return null;
			return { type: 'generic', categoryId: item.categoryId, name: item.name, quantity: (item.quantity ?? 1) * rentalQuantity };
		}).flat().filter(Boolean);

		try {
			await onSubmit({
				productId: selectedProductId,
				customer: { name: customerName, hotel: customerHotel, phone: customerPhone, id: customerId },
				items: rentalItems,
				rentalType,
				quantity: rentalQuantity,
				guideId: selectedGuideId || null,
				fromReservationId: fromReservationId || undefined
			});
		} catch (e: any) {
			error = e.message || 'Failed to create rental';
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={resetForm}>
		<div class="modal-content large" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">{fromReservationId ? 'event' : 'add_shopping_cart'}</span>
					<h2 class="md-headline-small">{fromReservationId ? 'Start Rental from Reservation' : 'Create Rental'}</h2>
				</div>
				<md-icon-button onclick={resetForm}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>

			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">category</span>
						<span class="md-title-small">Select Product</span>
					</label>
					<select class="form-select" bind:value={selectedProductId} disabled={loading}>
						<option value={null}>Choose a rental product...</option>
						{#each products as product}
							<option value={product.id}>{product.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">numbers</span>
						<span class="md-title-small">Quantity</span>
					</label>
					<div class="quantity-control">
						<button class="qty-btn" onclick={() => rentalQuantity = Math.max(1, rentalQuantity - 1)} disabled={loading || rentalQuantity <= 1} aria-label="Decrease quantity">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{rentalQuantity}</span>
						<button class="qty-btn" onclick={() => rentalQuantity = Math.min(10, rentalQuantity + 1)} disabled={loading || rentalQuantity >= 10} aria-label="Increase quantity">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
					<p class="form-hint md-body-small">Number of {selectedProduct?.name || 'rentals'}</p>
				</div>

				{#if selectedProduct}
					<div class="form-section">
						<label class="form-label">
							<span class="material-symbols-rounded">handyman</span>
							<span class="md-title-small">Equipment</span>
						</label>
						<div class="equipment-list">
							{#each productEquipment as item}
								{#if item.type === 'tracked'}
									<div class="equipment-card tracked">
										<div class="equipment-header">
											<span class="material-symbols-rounded">qr_code_2</span>
											<span class="md-body-medium">{item.name}</span>
											<span class="need-badge">need {rentalQuantity}</span>
										</div>
										<input
											type="text"
											placeholder="Search by code..."
											value={searchQueries[item.categoryId ?? 0] || ''}
											oninput={(e) => searchQueries[item.categoryId ?? 0] = e.currentTarget.value}
											class="search-input"
										/>
										{#if getFilteredTrackedItems(item.categoryId ?? 0).length > 0}
											<div class="tracked-items-grid">
												{#each getFilteredTrackedItems(item.categoryId ?? 0) as available}
													{@const isSelected = selectedTrackedItems[item.categoryId ?? 0]?.includes(available.id)}
													<button
														class="tracked-item-btn"
														class:selected={isSelected}
														onclick={() => {
															const ids = selectedTrackedItems[item.categoryId ?? 0] || [];
															if (ids.includes(available.id)) {
																selectedTrackedItems[item.categoryId ?? 0] = ids.filter(id => id !== available.id);
															} else if (ids.length < rentalQuantity) {
																selectedTrackedItems[item.categoryId ?? 0] = [...ids, available.id];
															}
															selectedTrackedItems = selectedTrackedItems;
														}}
														disabled={!isSelected && (selectedTrackedItems[item.categoryId ?? 0]?.length ?? 0) >= rentalQuantity}
														aria-pressed={isSelected}
														aria-label="{available.code} {isSelected ? 'selected' : 'not selected'}"
													>
														<span class="material-symbols-rounded" aria-hidden="true">{isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
														<span class="md-label-large">{available.code}</span>
													</button>
												{/each}
											</div>
										{:else}
											<p class="no-items md-body-small">No items available</p>
										{/if}
										{#if (selectedTrackedItems[item.categoryId ?? 0] || []).length > 0}
											<div class="selected-summary">
												<span class="material-symbols-rounded">check</span>
												<span class="md-body-small">
													Selected ({(selectedTrackedItems[item.categoryId ?? 0] || []).length}/{rentalQuantity}):
													{(selectedTrackedItems[item.categoryId ?? 0] || [])
														.map(id => trackedItems.find((t: any) => t.id === id)?.code)
														.join(', ')}
												</span>
											</div>
										{/if}
									</div>
								{:else}
									{@const available = getCategoryAvailability(item.categoryId ?? 0)}
									{@const needed = (item.quantity ?? 1) * rentalQuantity}
									{@const canInclude = available >= needed}
									<div class="equipment-card generic" class:unavailable={!canInclude}>
										<label class="generic-checkbox">
											<md-checkbox
												checked={includedGenericItems[item.categoryId ?? 0] && canInclude}
												onchange={(e: Event) => includedGenericItems[item.categoryId ?? 0] = (e.target as HTMLInputElement).checked}
												disabled={!canInclude}
											></md-checkbox>
											<span class="material-symbols-rounded">inventory_2</span>
											<span class="md-body-medium">{item.name} x{needed}</span>
											{#if !canInclude}
												<span class="stock-warning">
													<span class="material-symbols-rounded icon-xs">warning</span>
													Only {available} available
												</span>
											{/if}
										</label>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">person</span>
						<span class="md-title-small">Customer Information</span>
					</label>
					<div class="customer-form-grid">
						<md-outlined-text-field label="Name *" value={customerName} oninput={(e: Event) => customerName = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">badge</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Hotel" value={customerHotel} oninput={(e: Event) => customerHotel = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">hotel</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Phone" type="tel" value={customerPhone} oninput={(e: Event) => customerPhone = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">phone</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Customer ID" value={customerId} oninput={(e: Event) => customerId = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">id_card</span>
						</md-outlined-text-field>
					</div>
				</div>

				{#if selectedProduct?.requiresGuide}
					<div class="form-section">
						<GuideSelector {guides} bind:selectedGuideId {loading} onVerifyPin={onVerifyPin} />
					</div>
				{/if}

				{#if hasHourlyOption}
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
									<span class="md-label-medium">${productPricing.hourly}/hr</span>
								</div>
							</label>
							{#if productPricing.fullDay}
								<label class="type-option" class:selected={rentalType === 'fullDay'}>
									<input type="radio" bind:group={rentalType} value="fullDay" disabled={loading} />
									<span class="material-symbols-rounded">wb_sunny</span>
									<div class="type-info">
										<span class="md-body-medium">Full Day</span>
										<span class="md-label-medium">${productPricing.fullDay}</span>
									</div>
								</label>
							{/if}
						</div>
					</div>
				{/if}

				{#if error}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{error}</span>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<md-outlined-button onclick={resetForm} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSubmit} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Create Rental
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
		z-index: 100;
		padding: var(--md-sys-spacing-md);
		animation: fade-in 0.2s var(--md-sys-motion-easing-standard);
	}
	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized);
	}
	.modal-content.large { max-width: 700px; }
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		flex-shrink: 0;
	}
	.modal-title {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
	}
	.modal-title .material-symbols-rounded {
		font-size: 32px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xl);
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		flex-shrink: 0;
	}
	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}
	.form-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-title-small);
		margin: 0;
	}
	.form-label .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
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
	.form-select:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.form-hint { color: var(--md-sys-color-on-surface-variant); margin: 0; }
	.quantity-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding-top: var(--md-sys-spacing-sm);
	}
	.qty-btn {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-surface-container-high);
		border: none;
		border-radius: var(--md-sys-shape-corner-full);
		color: var(--md-sys-color-on-surface);
		cursor: pointer;
		flex-shrink: 0;
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}
	.qty-btn:hover:not(:disabled) { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
	.qty-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.qty-value { flex: 1; text-align: center; color: var(--md-sys-color-on-surface); }
	.customer-form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--md-sys-spacing-md);
	}
	.customer-form-grid md-outlined-text-field { width: 100%; }
	.equipment-list { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.equipment-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}
	.equipment-card.unavailable { opacity: 0.6; }
	.equipment-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-md);
	}
	.equipment-header .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.need-badge {
		margin-left: auto;
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		flex-shrink: 0;
	}
	.search-input {
		width: 100%;
		padding: var(--md-sys-spacing-sm);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-body-medium);
		margin-bottom: var(--md-sys-spacing-sm);
	}
	.search-input:focus { outline: none; border-color: var(--md-sys-color-primary); }
	.tracked-items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--md-sys-spacing-sm);
		max-height: 150px;
		overflow-y: auto;
	}
	.tracked-item-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-xl);
		min-height: 44px;
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}
	.tracked-item-btn:hover:not(:disabled) { background: var(--md-sys-color-surface-container); }
	.tracked-item-btn.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}
	.tracked-item-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.tracked-item-btn .material-symbols-rounded { font-size: 20px; flex-shrink: 0; }
	.no-items { color: var(--md-sys-color-on-surface-variant); text-align: center; padding: var(--md-sys-spacing-md); }
	.selected-summary {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-sm);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-small);
		margin-top: var(--md-sys-spacing-sm);
	}
	.selected-summary .material-symbols-rounded { font-size: 18px; }
	.generic-checkbox {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		cursor: pointer;
	}
	.generic-checkbox .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.generic-checkbox md-checkbox { flex-shrink: 0; }
	.stock-warning {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		margin-left: auto;
		color: var(--md-sys-color-error);
		font: var(--md-sys-typescale-label-small);
	}
	.rental-type-selector { display: flex; gap: var(--md-sys-spacing-md); }
	.type-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-xl);
		min-height: 60px;
		background: var(--md-sys-color-surface-container-low);
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}
	.type-option:hover { background: var(--md-sys-color-surface-container); }
	.type-option.selected { border-color: var(--md-sys-color-primary); background: var(--md-sys-color-primary-container); }
	.type-option input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
	.type-option:has(input:focus-visible) { outline: 2px solid var(--md-sys-color-primary); outline-offset: 2px; }
	.type-option .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.type-info { display: flex; flex-direction: column; }
	.type-info .md-label-medium { color: var(--md-sys-color-primary); }
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}
	.error-banner .material-symbols-rounded { font-size: 20px; }
	.icon-xs { font-size: 14px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@media (max-width: 768px) {
		.customer-form-grid { grid-template-columns: 1fr; }
		.rental-type-selector { flex-direction: column; }
		.modal-content.large { max-width: 100%; }
	}
</style>
