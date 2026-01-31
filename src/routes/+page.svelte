<script lang="ts">
	import { shiftStore } from '$lib/stores/shift';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/checkbox/checkbox.js';
	import '@material/web/radio/radio.js';
	import '@material/web/select/outlined-select.js';
	import '@material/web/select/select-option.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CloseRentalModal from '$lib/components/CloseRentalModal.svelte';
	import EditRentalModal from '$lib/components/EditRentalModal.svelte';
	import GuideSelector from '$lib/components/GuideSelector.svelte';

	let { data } = $props();

	let closeRentalModalOpen = $state(false);
	let selectedRentalToClose = $state<any>(null);
	let editRentalModalOpen = $state(false);
	let selectedRentalToEdit = $state<any>(null);
	let confirmEndShift = $state(false);
	let showShiftSummary = $state(false);
	let shiftSummary = $state<{
		rentalsCount: number,
		rentalsCash: number,
		rentalsCredit: number,
		storeSalesCount: number,
		storeSalesTotal: number,
		totalCash: number,
		totalCredit: number
	} | null>(null);
	let showStoreSaleModal = $state(false);
	let selectedStoreProductId = $state<number | null>(null);
	let saleQuantity = $state(1);
	let saleError = $state('');

	async function handleEndShift() {
		error = '';
		if (!$shiftStore.shift?.id) {
			error = 'No active shift found';
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/shifts/summary?shiftId=${$shiftStore.shift.id}`);
			if (res.ok) {
				shiftSummary = await res.json();
				showShiftSummary = true;
			} else {
				const d = await res.json();
				error = d.error || 'Failed to load shift summary';
			}
		} catch (e) {
			error = 'Network error loading shift summary';
		}
		loading = false;
	}

	async function executeEndShift() {
		loading = true;
		try {
			const res = await fetch('/api/shifts/close', { method: 'POST' });
			if (res.ok) {
				const blob = await res.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `shift-report-${new Date().toISOString().split('T')[0]}.xlsx`;
				a.click();
				window.URL.revokeObjectURL(url);
				shiftStore.clearSession();
				await invalidateAll();
			} else {
				error = 'Failed to close shift';
			}
		} catch (e) {
			error = 'Failed to close shift';
		}
		loading = false;
	}

	let showForm = $state(false);
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
	let loading = $state(false);
	let error = $state('');
	let searchQueries = $state<Record<number, string>>({});

	async function verifyGuidePin(guideId: number, pin: string): Promise<boolean> {
		try {
			const res = await fetch('/api/guides/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guideId, passcode: pin })
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	type EquipmentItem = { type: string; itemId?: number; categoryId?: number; name: string; quantity?: number };

	type Pricing = { hourly?: number; fullDay?: number };

	const selectedProduct = $derived(selectedProductId ? data.products.find(p => p.id === selectedProductId) : null);
	const productEquipment = $derived<EquipmentItem[]>(selectedProduct?.equipment as EquipmentItem[] ?? []);
	const productPricing = $derived<Pricing>(selectedProduct?.pricing as Pricing ?? {});
	const selectedStoreProduct = $derived(selectedStoreProductId ? data.storeProducts.find(p => p.id === selectedStoreProductId) : null);
	const hasHourlyOption = $derived(!!productPricing.hourly);

	function initProductForm(product: typeof selectedProduct) {
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

	function getFilteredTrackedItems(categoryId: number) {
		const items = data.trackedItems.filter(t => t.productTypeId === categoryId && t.status === 'available');
		const query = searchQueries[categoryId];
		if (!query) return items;
		return items.filter(t => t.code.toLowerCase().includes(query.toLowerCase()));
	}

	function getCategoryAvailability(categoryId: number) {
		const cat = data.categories.find(c => c.id === categoryId);
		return cat?.availableQuantity ?? 0;
	}

	function resetForm() {
		showForm = false;
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
	}

	async function createRental() {
		if (!selectedProductId) {
			error = 'Select a product';
			return;
		}
		if (!customerName.trim()) {
			error = 'Customer name required';
			return;
		}

		for (const item of productEquipment.filter(e => e.type === 'tracked')) {
			const selectedIds = selectedTrackedItems[item.categoryId ?? 0] || [];
			if (selectedIds.length !== rentalQuantity) {
				error = `Select ${rentalQuantity} items for ${item.name}`;
				return;
			}
		}

		loading = true;
		error = '';

		const rentalItems = productEquipment.map(item => {
			if (item.type === 'tracked') {
				const selectedIds = selectedTrackedItems[item.categoryId ?? 0] || [];
				return selectedIds.map(selectedId => {
					const selected = data.trackedItems.find(t => t.id === selectedId);
					return { type: 'tracked', itemId: selectedId, code: selected?.code, name: item.name, categoryId: item.categoryId };
				});
			}
			if (!includedGenericItems[item.categoryId ?? 0]) return null;
			return { type: 'generic', categoryId: item.categoryId, name: item.name, quantity: (item.quantity ?? 1) * rentalQuantity };
		}).flat().filter(Boolean);

		const res = await fetch('/api/rentals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				productId: selectedProductId,
				shiftId: $shiftStore.shift?.id,
				customer: { name: customerName, hotel: customerHotel, phone: customerPhone, id: customerId },
				items: rentalItems,
				rentalType,
				quantity: rentalQuantity,
				guideId: selectedGuideId || null
			})
		});

		if (res.ok) {
			resetForm();
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create rental';
		}
		loading = false;
	}

	function promptCloseRental(id: number) {
		selectedRentalToClose = data.rentals.find(r => r.id === id);
		closeRentalModalOpen = true;
	}

	function promptEditRental(id: number) {
		selectedRentalToEdit = data.rentals.find(r => r.id === id);
		editRentalModalOpen = true;
	}

	async function executeEditRental(updateData: { customer: object; rentalType: string; notes: string }) {
		if (!selectedRentalToEdit) return;
		loading = true;
		try {
			const res = await fetch('/api/rentals', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: selectedRentalToEdit.id,
					action: 'edit',
					customer: updateData.customer,
					rentalType: updateData.rentalType,
					notes: updateData.notes
				})
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				const d = await res.json();
				error = d.error || 'Failed to update rental';
			}
		} catch {
			error = 'Network error updating rental';
		} finally {
			loading = false;
			selectedRentalToEdit = null;
		}
	}

	async function createStoreSale() {
		if (!selectedStoreProductId) {
			saleError = 'Select a product';
			return;
		}
		if (saleQuantity < 1) {
			saleError = 'Quantity must be at least 1';
			return;
		}
		loading = true;
		saleError = '';
		const res = await fetch('/api/store-sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				shiftId: $shiftStore.shift?.id,
				productId: selectedStoreProductId,
				quantity: saleQuantity
			})
		});
		if (res.ok) {
			showStoreSaleModal = false;
			selectedStoreProductId = null;
			saleQuantity = 1;
			await invalidateAll();
		} else {
			const d = await res.json();
			saleError = d.error || 'Failed to create sale';
		}
		loading = false;
	}

	async function executeCloseRental(returnData: any) {
		if (!selectedRentalToClose) return;
		loading = true;
		const res = await fetch('/api/rentals', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: selectedRentalToClose.id,
				action: 'close',
				returnData,
				currentShiftId: $shiftStore.shift?.id
			})
		});
		if (res.ok) await invalidateAll();
		loading = false;
		selectedRentalToClose = null;
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
</script>

{#if $shiftStore.isLoggedIn}
	<div class="app-shell">
		<!-- Top App Bar -->
		<header class="app-header">
			<div class="header-start">
				<span class="material-symbols-rounded header-icon">point_of_sale</span>
				<h1 class="md-headline-small">Rental Manager</h1>
			</div>
			<div class="header-end">
				{#if error}
					<div class="header-error">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-small">{error}</span>
					</div>
				{/if}
				<div class="operator-badge">
					<span class="material-symbols-rounded">person</span>
					<span class="md-label-large">{$shiftStore.operator?.name}</span>
				</div>
				<md-outlined-button onclick={handleEndShift} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">logout</span>
					End Shift
				</md-outlined-button>
			</div>
		</header>

		<main class="app-main">
			<!-- Action Bar -->
			<div class="action-bar">
				<md-filled-button onclick={() => { showForm = true; error = ''; }}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					New Rental
				</md-filled-button>
				{#if data.storeProducts.length > 0}
					<md-filled-tonal-button onclick={() => { showStoreSaleModal = true; saleError = ''; }}>
						<span class="material-symbols-rounded" slot="icon">shopping_cart</span>
						Store Sale
					</md-filled-tonal-button>
				{/if}
				<div class="stats-badges">
					<div class="stat-badge active">
						<span class="material-symbols-rounded">pending</span>
						<span class="md-label-medium">{data.rentals.length} Active</span>
					</div>
					<div class="stat-badge previous">
						<span class="material-symbols-rounded">history</span>
						<span class="md-label-medium">{data.previousShiftRentals.length} Previous</span>
					</div>
				</div>
			</div>

			<!-- Active Rentals Section -->
			<section class="rentals-section">
				<div class="section-header">
					<span class="material-symbols-rounded">schedule</span>
					<h2 class="md-title-large">Active Rentals</h2>
					<span class="count-badge md-label-medium">{data.rentals.length}</span>
				</div>

				{#if data.rentals.length === 0}
					<div class="empty-state">
						<span class="material-symbols-rounded">event_available</span>
						<p class="md-body-large">No active rentals</p>
						<p class="md-body-medium">Click "New Rental" to get started</p>
					</div>
				{:else}
					<div class="rentals-grid">
						{#each data.rentals as rental}
							{@const customer = rental.customer as {name?: string, hotel?: string}}
							{@const items = rental.items as Array<{name: string, quantity?: number, code?: string}>}
							{@const pricing = rental.pricing as {type?: string}}
							<div class="rental-card">
								<div class="rental-header">
									<div class="customer-info">
										<span class="material-symbols-rounded customer-icon">person</span>
										<div class="customer-details">
											<span class="md-title-medium">{customer?.name || 'Unknown'}</span>
											{#if customer?.hotel}
												<span class="md-body-small hotel-text">
													<span class="material-symbols-rounded icon-xs">hotel</span>
													{customer.hotel}
												</span>
											{/if}
										</div>
									</div>
									<div class="rental-type-badge" class:hourly={pricing.type === 'hourly'} class:fullday={pricing.type !== 'hourly'}>
										{pricing.type === 'hourly' ? 'Hourly' : 'Full Day'}
									</div>
								</div>

								<div class="rental-items-list">
									{#each items as item}
										<div class="item-chip">
											<span class="material-symbols-rounded icon-sm">
												{item.code ? 'qr_code_2' : 'inventory_2'}
											</span>
											<span class="md-body-small">
												{item.name}{item.code ? ` (${item.code})` : ''}{item.quantity ? ` x${item.quantity}` : ''}
											</span>
										</div>
									{/each}
								</div>

								<div class="rental-footer">
									<div class="time-info">
										<span class="material-symbols-rounded icon-sm">schedule</span>
										<span class="md-body-small">Started {new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
										<span class="elapsed-badge">{getElapsedTime(rental.startedAt)}</span>
									</div>
									<div class="rental-actions">
										<md-icon-button onclick={() => promptEditRental(rental.id)} disabled={loading} aria-label="Edit rental">
											<span class="material-symbols-rounded">edit</span>
										</md-icon-button>
										<md-filled-tonal-button onclick={() => promptCloseRental(rental.id)} disabled={loading}>
											<span class="material-symbols-rounded" slot="icon">check_circle</span>
											Close Rental
										</md-filled-tonal-button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Previous Shift Rentals Section -->
			<section class="rentals-section previous-section">
				<div class="section-header">
					<span class="material-symbols-rounded">history</span>
					<h2 class="md-title-large">Previous Shift Rentals</h2>
					<span class="count-badge md-label-medium">{data.previousShiftRentals.length}</span>
				</div>

				{#if data.previousShiftRentals.length === 0}
					<div class="empty-state compact">
						<span class="material-symbols-rounded">folder_off</span>
						<p class="md-body-medium">No previous rentals</p>
					</div>
				{:else}
					<div class="rentals-grid previous">
						{#each data.previousShiftRentals as rental}
							{@const customer = rental.customer as {name?: string, hotel?: string}}
							{@const items = rental.items as Array<{name: string, quantity?: number, code?: string}>}
							{@const pricing = rental.pricing as {type?: string, total?: number}}
							<div class="rental-card completed">
								<div class="rental-header">
									<div class="customer-info">
										<span class="material-symbols-rounded customer-icon">person</span>
										<div class="customer-details">
											<span class="md-title-medium">{customer?.name || 'Unknown'}</span>
											{#if customer?.hotel}
												<span class="md-body-small hotel-text">
													<span class="material-symbols-rounded icon-xs">hotel</span>
													{customer.hotel}
												</span>
											{/if}
										</div>
									</div>
									{#if pricing?.total}
										<div class="price-badge">
											${(pricing.total / 100).toFixed(2)}
										</div>
									{/if}
								</div>

								<div class="rental-items-list compact">
									{#each items as item}
										<span class="item-text md-body-small">
											{item.name}{item.code ? ` (${item.code})` : ''}{item.quantity ? ` x${item.quantity}` : ''}
										</span>
									{/each}
								</div>

								<div class="rental-times">
									<div class="time-row">
										<span class="material-symbols-rounded icon-xs">schedule</span>
										<span class="md-body-small">
											{new Date(rental.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
										</span>
									</div>
									{#if rental.returnedAt}
										<div class="time-row returned">
											<span class="material-symbols-rounded icon-xs">check_circle</span>
											<span class="md-body-small">
												{new Date(rental.returnedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
											</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</main>

		<!-- Create Rental Modal -->
		{#if showForm}
			<div class="modal-overlay" onclick={resetForm}>
				<div class="modal-content large" onclick={(e) => e.stopPropagation()}>
					<div class="modal-header">
						<div class="modal-title">
							<span class="material-symbols-rounded">add_shopping_cart</span>
							<h2 class="md-headline-small">Create Rental</h2>
						</div>
						<md-icon-button onclick={resetForm}>
							<span class="material-symbols-rounded">close</span>
						</md-icon-button>
					</div>

					<div class="modal-body">
						<!-- Product Selection -->
						<div class="form-section">
							<label class="form-label">
								<span class="material-symbols-rounded">category</span>
								<span class="md-title-small">Select Product</span>
							</label>
							<select class="form-select" bind:value={selectedProductId} disabled={loading}>
								<option value={null}>Choose a rental product...</option>
								{#each data.products as product}
									<option value={product.id}>{product.name}</option>
								{/each}
							</select>
						</div>

						<!-- Quantity -->
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
							<!-- Equipment Selection -->
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
																.map(id => data.trackedItems.find(t => t.id === id)?.code)
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

						{#if selectedProduct?.requiresGuide}
							<div class="form-section">
								<GuideSelector
									guides={data.guides}
									bind:selectedGuideId
									loading={loading}
									onVerifyPin={verifyGuidePin}
								/>
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
						<md-filled-button onclick={createRental} disabled={loading}>
							<span class="material-symbols-rounded" slot="icon">check</span>
							Create Rental
						</md-filled-button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<!-- Not Logged In State -->
	<div class="login-prompt">
		<div class="login-card">
			<div class="login-icon">
				<span class="material-symbols-rounded">point_of_sale</span>
			</div>
			<h1 class="md-headline-medium">Rental Manager</h1>
			<p class="md-body-large">Select your profile to start a shift</p>
			<a href="/login">
				<md-filled-button>
					<span class="material-symbols-rounded" slot="icon">login</span>
					Start Shift
				</md-filled-button>
			</a>
		</div>
	</div>
{/if}

<!-- Shift Summary Modal -->
{#if showShiftSummary && shiftSummary}
	<div class="modal-overlay" onclick={() => { showShiftSummary = false; }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">summarize</span>
					<h2 class="md-headline-small">Shift Summary</h2>
				</div>
				<md-icon-button onclick={() => { showShiftSummary = false; }}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>

			<div class="modal-body">
				<div class="summary-section">
					<div class="summary-header">
						<span class="material-symbols-rounded">receipt_long</span>
						<span class="md-title-medium">Rentals ({shiftSummary.rentalsCount})</span>
					</div>
					<div class="summary-row">
						<span class="md-body-medium">Cash</span>
						<span class="md-title-medium">${shiftSummary.rentalsCash.toFixed(2)}</span>
					</div>
					<div class="summary-row">
						<span class="md-body-medium">Credit</span>
						<span class="md-title-medium">${shiftSummary.rentalsCredit.toFixed(2)}</span>
					</div>
				</div>

				{#if shiftSummary.storeSalesCount > 0}
					<div class="summary-section">
						<div class="summary-header">
							<span class="material-symbols-rounded">shopping_cart</span>
							<span class="md-title-medium">Store Sales ({shiftSummary.storeSalesCount})</span>
						</div>
						<div class="summary-row">
							<span class="md-body-medium">Total</span>
							<span class="md-title-medium">${shiftSummary.storeSalesTotal.toFixed(2)}</span>
						</div>
					</div>
				{/if}

				<div class="summary-section totals">
					<div class="summary-header">
						<span class="material-symbols-rounded">payments</span>
						<span class="md-title-medium">Totals</span>
					</div>
					<div class="summary-row total">
						<span class="md-body-medium">Cash</span>
						<span class="md-headline-small">${shiftSummary.totalCash.toFixed(2)}</span>
					</div>
					<div class="summary-row total">
						<span class="md-body-medium">Credit</span>
						<span class="md-headline-small">${shiftSummary.totalCredit.toFixed(2)}</span>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<md-outlined-button onclick={() => { showShiftSummary = false; }}>Cancel</md-outlined-button>
				<md-filled-button class="danger-btn" onclick={() => { showShiftSummary = false; executeEndShift(); }}>
					<span class="material-symbols-rounded" slot="icon">download</span>
					End Shift & Download Report
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<!-- Store Sale Modal -->
{#if showStoreSaleModal}
	<div class="modal-overlay" onclick={() => { showStoreSaleModal = false; }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">shopping_cart</span>
					<h2 class="md-headline-small">Store Sale</h2>
				</div>
				<md-icon-button onclick={() => { showStoreSaleModal = false; }}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>

			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">inventory_2</span>
						<span class="md-title-small">Select Product</span>
					</label>
					<select class="form-select" bind:value={selectedStoreProductId} disabled={loading}>
						<option value={null}>Choose a product...</option>
						{#each data.storeProducts as product}
							<option value={product.id}>
								{product.name} - ${(product.price / 100).toFixed(2)} ({product.quantity} in stock)
							</option>
						{/each}
					</select>
				</div>

				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">numbers</span>
						<span class="md-title-small">Quantity</span>
					</label>
					<div class="quantity-control">
						<button class="qty-btn" onclick={() => saleQuantity = Math.max(1, saleQuantity - 1)} disabled={loading || saleQuantity <= 1} aria-label="Decrease quantity">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{saleQuantity}</span>
						<button class="qty-btn" onclick={() => saleQuantity = Math.min(selectedStoreProduct?.quantity ?? 1, saleQuantity + 1)} disabled={loading || saleQuantity >= (selectedStoreProduct?.quantity ?? 1)} aria-label="Increase quantity">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
				</div>

				{#if saleError}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{saleError}</span>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<md-outlined-button onclick={() => { showStoreSaleModal = false; }} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={createStoreSale} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">point_of_sale</span>
					Complete Sale
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<CloseRentalModal
	bind:open={closeRentalModalOpen}
	rental={selectedRentalToClose}
	operatorPasscode={$shiftStore.operator?.passcode || ''}
	onClose={executeCloseRental}
	onCancel={() => { closeRentalModalOpen = false; }}
/>

<EditRentalModal
	bind:open={editRentalModalOpen}
	rental={selectedRentalToEdit}
	onSave={executeEditRental}
	onCancel={() => { editRentalModalOpen = false; }}
/>

<ConfirmModal
	bind:open={confirmEndShift}
	title="End Shift"
	message="Are you sure you want to end your shift? Make sure all rentals are closed."
	confirmText="End Shift"
	cancelText="Cancel"
	variant="warning"
	onConfirm={executeEndShift}
/>

<style>
	/* App Shell */
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--md-sys-color-surface-container-lowest);
	}

	/* App Header */
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		box-shadow: var(--md-sys-elevation-level1);
		position: sticky;
		top: 0;
		z-index: 10;
		overflow: visible;
	}

	.header-start {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		min-width: 0;
		flex-shrink: 1;
		overflow: hidden;
	}

	.header-icon {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.header-start h1 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-end {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		flex-shrink: 0;
	}

	.header-error {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.header-error .material-symbols-rounded {
		font-size: 18px;
	}

	.operator-badge {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-md);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.operator-badge .material-symbols-rounded {
		font-size: 20px;
	}

	/* Ensure Material Web buttons never clip their content */
	.app-header md-outlined-button,
	.app-header md-filled-button,
	.action-bar md-filled-button,
	.action-bar md-filled-tonal-button {
		flex-shrink: 0;
		white-space: nowrap;
	}

	/* Main Content */
	.app-main {
		flex: 1;
		overflow-y: auto;
		padding: var(--md-sys-spacing-lg);
	}

	/* Action Bar */
	.action-bar {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		margin-bottom: var(--md-sys-spacing-lg);
		flex-wrap: wrap;
	}

	.stats-badges {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		margin-left: auto;
	}

	.stat-badge {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.stat-badge.active {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.stat-badge.previous {
		background: var(--md-sys-color-surface-container-high);
		color: var(--md-sys-color-on-surface-variant);
	}

	.stat-badge .material-symbols-rounded {
		font-size: 18px;
	}

	/* Rentals Section */
	.rentals-section {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-large);
		border: 1px solid var(--md-sys-color-outline-variant);
		overflow: hidden;
		margin-bottom: var(--md-sys-spacing-lg);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface-container-low);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	.section-header .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	.section-header h2 {
		flex: 1;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.count-badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Rentals Grid */
	.rentals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
	}

	.rentals-grid.previous {
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}

	/* Rental Card */
	.rental-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
		transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.rental-card:hover {
		box-shadow: var(--md-sys-elevation-level2);
	}

	.rental-card.completed {
		opacity: 0.85;
		background: var(--md-sys-color-surface);
	}

	.rental-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
	}

	.customer-info {
		display: flex;
		align-items: flex-start;
		gap: var(--md-sys-spacing-sm);
	}

	.customer-icon {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
		padding: var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.customer-details {
		display: flex;
		flex-direction: column;
	}

	.customer-details .md-title-medium {
		color: var(--md-sys-color-on-surface);
	}

	.hotel-text {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.rental-type-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-medium);
	}

	.rental-type-badge.hourly {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.rental-type-badge.fullday {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.price-badge {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-title-medium);
		font-weight: 600;
	}

	.rental-items-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--md-sys-spacing-xs);
	}

	.rental-items-list.compact {
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.item-chip {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-small);
		color: var(--md-sys-color-on-surface);
	}

	.item-text {
		color: var(--md-sys-color-on-surface-variant);
	}

	.rental-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: var(--md-sys-spacing-sm);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.rental-actions {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.time-info {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.elapsed-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 500;
	}

	.rental-times {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.time-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.time-row.returned {
		color: var(--md-sys-color-success);
	}

	/* Icon Sizes */
	.icon-xs {
		font-size: 14px;
	}

	.icon-sm {
		font-size: 18px;
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

	.empty-state.compact {
		padding: var(--md-sys-spacing-xl);
	}

	.empty-state .material-symbols-rounded {
		font-size: 48px;
		opacity: 0.5;
	}

	.empty-state p {
		margin: 0;
		text-align: center;
	}

	/* Login Prompt */
	.login-prompt {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface) 100%);
		padding: var(--md-sys-spacing-lg);
	}

	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xxl);
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		box-shadow: var(--md-sys-elevation-level3);
		text-align: center;
		animation: md-animate-scale-in 0.3s var(--md-sys-motion-easing-emphasized-decelerate);
	}

	.login-icon {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.login-icon .material-symbols-rounded {
		font-size: 40px;
		color: var(--md-sys-color-on-primary-container);
	}

	.login-card h1 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.login-card p {
		margin: 0;
		color: var(--md-sys-color-on-surface-variant);
	}

	.login-card a {
		text-decoration: none;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
		padding: var(--md-sys-spacing-md);
		animation: md-animate-fade-in 0.2s var(--md-sys-motion-easing-standard);
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

	.modal-title h2 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

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
		background: var(--md-sys-color-surface);
		flex-shrink: 0;
	}

	.modal-footer md-outlined-button,
	.modal-footer md-filled-button {
		min-width: auto;
	}

	/* Form Styles */
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

	.form-select:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
		border-width: 2px;
	}

	.form-hint {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
	}

	/* Quantity Control */
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

	.qty-btn:hover:not(:disabled) {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.qty-btn:disabled {
		opacity: 0.38;
		cursor: not-allowed;
	}

	.qty-btn .material-symbols-rounded {
		font-size: 24px;
	}

	.qty-value {
		flex: 1;
		text-align: center;
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-title-large);
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

	/* Equipment List */
	.equipment-list {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.equipment-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}

	.equipment-card.unavailable {
		opacity: 0.6;
	}

	.equipment-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-md);
	}

	.equipment-header .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

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

	.search-input:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
	}

	.tracked-items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--md-sys-spacing-xs);
		max-height: 150px;
		overflow-y: auto;
	}

	.tracked-item-btn {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
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
		opacity: 0.38;
		cursor: not-allowed;
	}

	.tracked-item-btn .material-symbols-rounded {
		font-size: 18px;
	}

	.no-items {
		color: var(--md-sys-color-on-surface-variant);
		text-align: center;
		padding: var(--md-sys-spacing-md);
	}

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

	.selected-summary .material-symbols-rounded {
		font-size: 18px;
	}

	.generic-checkbox {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		cursor: pointer;
	}

	.generic-checkbox .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	.generic-checkbox md-checkbox {
		flex-shrink: 0;
	}

	.stock-warning {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		margin-left: auto;
		color: var(--md-sys-color-error);
		font: var(--md-sys-typescale-label-small);
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
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
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

	.type-option:has(input:focus-visible) {
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

	/* Summary Styles */
	.summary-section {
		background: var(--md-sys-color-surface-container-low);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}

	.summary-section.totals {
		background: var(--md-sys-color-secondary-container);
		border: 2px solid var(--md-sys-color-primary);
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-md);
		padding-bottom: var(--md-sys-spacing-md);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		font: var(--md-sys-typescale-title-medium);
	}

	.summary-header .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	.summary-section.totals .summary-header .material-symbols-rounded {
		color: var(--md-sys-color-on-secondary-container);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-sm) 0;
	}

	.summary-row .md-body-medium {
		color: var(--md-sys-color-on-surface-variant);
	}

	.summary-row .md-title-medium {
		color: var(--md-sys-color-primary);
	}

	.summary-row.total .md-headline-small {
		color: var(--md-sys-color-on-secondary-container);
	}

	.summary-section.totals .summary-row .md-body-medium {
		color: var(--md-sys-color-on-secondary-container);
	}

	/* Danger Button */
	.danger-btn {
		--md-filled-button-container-color: var(--md-sys-color-error);
		--md-filled-button-label-text-color: var(--md-sys-color-on-error);
	}

	/* Animations */
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

	@keyframes md-animate-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.app-header {
			flex-direction: column;
			gap: var(--md-sys-spacing-sm);
			padding: var(--md-sys-spacing-sm);
		}

		.header-end {
			width: 100%;
			justify-content: space-between;
		}

		.action-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.stats-badges {
			margin-left: 0;
			justify-content: center;
		}

		.rentals-grid {
			grid-template-columns: 1fr;
		}

		.customer-form-grid {
			grid-template-columns: 1fr;
		}

		.rental-type-selector {
			flex-direction: column;
		}

		.modal-content.large {
			max-width: 100%;
		}
	}
</style>
