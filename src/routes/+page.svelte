<script lang="ts">
	import { shiftStore } from '$lib/stores/shift';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CloseRentalModal from '$lib/components/CloseRentalModal.svelte';
	import GuideSelector from '$lib/components/GuideSelector.svelte';

	let { data } = $props();

	let closeRentalModalOpen = $state(false);
	let selectedRentalToClose = $state<any>(null);
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
</script>

{#if $shiftStore.isLoggedIn}
	<div class="app-shell">
		<header class="app-header">
			<h1>Rental Manager</h1>
			<div class="header-right">
				{#if error}
					<span class="header-error">{error}</span>
				{/if}
				<span class="operator-badge">{$shiftStore.operator?.name}</span>
				<md-outlined-button onclick={handleEndShift} disabled={loading}>End Shift</md-outlined-button>
			</div>
		</header>

		<main class="app-main">
			<section class="rentals-panel">
				<div class="action-buttons">
					<md-filled-button onclick={() => { showForm = true; error = ''; }}>
						New Rental
					</md-filled-button>
					{#if data.storeProducts.length > 0}
						<md-outlined-button onclick={() => { showStoreSaleModal = true; saleError = ''; }}>
							Store Sale
						</md-outlined-button>
					{/if}
				</div>

				<h2>Active Rentals</h2>
				{#if data.rentals.length === 0}
					<p>No active rentals</p>
				{:else}
					<div class="rentals-list">
						{#each data.rentals as rental}
							{@const customer = rental.customer as {name?: string, hotel?: string}}
							{@const items = rental.items as Array<{name: string, quantity?: number, code?: string}>}
							{@const pricing = rental.pricing as {type?: string}}
							<div class="rental-card">
								<div class="rental-customer">
									{customer?.name || 'Unknown'}
									{#if customer?.hotel}
										<span class="hotel-name">@ {customer.hotel}</span>
									{/if}
								</div>
								<div class="rental-items">
									{items.map(i => i.name + (i.code ? ` (${i.code})` : '') + (i.quantity ? ` x${i.quantity}` : '')).join(', ')}
								</div>
								<div class="rental-type">{pricing.type === 'hourly' ? 'Hourly' : 'Full Day'}</div>
								<div class="rental-time">Started: {new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
								<button class="close-btn" onclick={() => promptCloseRental(rental.id)} disabled={loading}>Close Rental</button>
							</div>
						{/each}
					</div>
				{/if}

				<h2 style="margin-top: 2rem;">Previous Shift Rentals</h2>
				{#if data.previousShiftRentals.length === 0}
					<p>No previous rentals</p>
				{:else}
					<div class="rentals-list">
						{#each data.previousShiftRentals as rental}
							{@const customer = rental.customer as {name?: string, hotel?: string}}
							{@const items = rental.items as Array<{name: string, quantity?: number, code?: string}>}
							{@const pricing = rental.pricing as {type?: string}}
							<div class="rental-card completed">
								<div class="rental-customer">
									{customer?.name || 'Unknown'}
									{#if customer?.hotel}
										<span class="hotel-name">@ {customer.hotel}</span>
									{/if}
								</div>
								<div class="rental-items">
									{items.map(i => i.name + (i.code ? ` (${i.code})` : '') + (i.quantity ? ` x${i.quantity}` : '')).join(', ')}
								</div>
								<div class="rental-type">{pricing.type === 'hourly' ? 'Hourly' : 'Full Day'}</div>
								<div class="rental-time">
									Rented: {new Date(rental.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
									{#if rental.returnedAt}
										→ Returned: {new Date(rental.returnedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
									{/if}
								</div>
								{#if pricing.total}
									<div class="rental-price">${(pricing.total / 100).toFixed(2)}</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</main>

		{#if showForm}
			<div class="modal-overlay" onclick={resetForm}>
				<div class="modal-content" onclick={(e) => e.stopPropagation()}>
					<div class="modal-header">
						<h2>Create Rental</h2>
						<button class="close-modal" onclick={resetForm}>x</button>
					</div>

					<div class="form-section">
						<label>Product</label>
						<select bind:value={selectedProductId} disabled={loading}>
							<option value={null}>Select a rental product...</option>
							{#each data.products as product}
								<option value={product.id}>{product.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-section">
						<label>Quantity</label>
						<input
							type="number"
							min="1"
							max="10"
							bind:value={rentalQuantity}
							disabled={loading}
							style="width: 100%; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px;"
						/>
						<p style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin-top: 0.25rem;">
							Number of {selectedProduct?.name || 'rentals'}
						</p>
					</div>

					{#if selectedProduct}
						<div class="form-section">
							<h3>Equipment</h3>
							{#each productEquipment as item}
								{#if item.type === 'tracked'}
									<div class="equipment-item">
										<label>{item.name} (need {rentalQuantity})</label>
										<input
											type="text"
											placeholder="Search by code..."
											value={searchQueries[item.categoryId ?? 0] || ''}
											oninput={(e) => searchQueries[item.categoryId ?? 0] = e.currentTarget.value}
											class="search-input"
										/>
										{#if getFilteredTrackedItems(item.categoryId ?? 0).length > 0}
											<div class="tracked-list">
												{#each getFilteredTrackedItems(item.categoryId ?? 0) as available}
													<div
														class="tracked-option"
														onclick={() => {
															const ids = selectedTrackedItems[item.categoryId ?? 0] || [];
															if (ids.includes(available.id)) {
																selectedTrackedItems[item.categoryId ?? 0] = ids.filter(id => id !== available.id);
															} else if (ids.length < rentalQuantity) {
																selectedTrackedItems[item.categoryId ?? 0] = [...ids, available.id];
															}
															selectedTrackedItems = selectedTrackedItems;
														}}
													>
														<span class:selected-tracked={selectedTrackedItems[item.categoryId ?? 0]?.includes(available.id)}>
															{available.code} {selectedTrackedItems[item.categoryId ?? 0]?.includes(available.id) ? '✓' : ''}
														</span>
													</div>
												{/each}
											</div>
										{/if}
										{#if (selectedTrackedItems[item.categoryId ?? 0] || []).length > 0}
											<p class="selected-item">
												Selected ({(selectedTrackedItems[item.categoryId ?? 0] || []).length}/{rentalQuantity}):
												{(selectedTrackedItems[item.categoryId ?? 0] || [])
													.map(id => data.trackedItems.find(t => t.id === id)?.code)
													.join(', ')}
											</p>
										{/if}
									</div>
								{:else}
									{@const available = getCategoryAvailability(item.categoryId ?? 0)}
									{@const needed = (item.quantity ?? 1) * rentalQuantity}
									{@const canInclude = available >= needed}
									<div class="equipment-item">
										<label class:unavailable={!canInclude}>
											<input
												type="checkbox"
												checked={includedGenericItems[item.categoryId ?? 0] && canInclude}
												onchange={(e) => includedGenericItems[item.categoryId ?? 0] = e.currentTarget.checked}
												disabled={!canInclude}
											/>
											{item.name} x{needed}
											{#if !canInclude}
												<span class="out-of-stock">(only {available} available)</span>
											{/if}
										</label>
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					<div class="form-section">
						<h3>Customer Info</h3>
						<div class="customer-fields">
							<md-outlined-text-field label="Name *" value={customerName} oninput={(e) => customerName = (e.target as HTMLInputElement).value} disabled={loading}></md-outlined-text-field>
							<md-outlined-text-field label="Hotel" value={customerHotel} oninput={(e) => customerHotel = (e.target as HTMLInputElement).value} disabled={loading}></md-outlined-text-field>
							<md-outlined-text-field label="Phone" value={customerPhone} oninput={(e) => customerPhone = (e.target as HTMLInputElement).value} disabled={loading}></md-outlined-text-field>
							<md-outlined-text-field label="Customer ID" value={customerId} oninput={(e) => customerId = (e.target as HTMLInputElement).value} disabled={loading}></md-outlined-text-field>
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
							<label>Rental Type</label>
							<div class="rental-type-options">
								<label><input type="radio" bind:group={rentalType} value="hourly" disabled={loading} /> Hourly (${productPricing.hourly}/hr)</label>
								{#if productPricing.fullDay}
									<label><input type="radio" bind:group={rentalType} value="fullDay" disabled={loading} /> Full Day (${productPricing.fullDay})</label>
								{/if}
							</div>
						</div>
					{/if}

					{#if error}
						<p class="error">{error}</p>
					{/if}

					<div class="modal-actions">
						<md-outlined-button onclick={resetForm} disabled={loading}>Cancel</md-outlined-button>
						<md-filled-button onclick={createRental} disabled={loading}>Create Rental</md-filled-button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="login-container">
		<div class="login-card">
			<h1>Rental Manager</h1>
			<p>Select your profile to start a shift</p>
			<a href="/login"><md-filled-button>Start Shift</md-filled-button></a>
		</div>
	</div>
{/if}

{#if showShiftSummary && shiftSummary}
	<div class="modal-overlay" onclick={() => { showShiftSummary = false; }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Shift Summary</h2>
				<button class="close-modal" onclick={() => { showShiftSummary = false; }}>x</button>
			</div>
			<div class="shift-summary-content">
				<h3>Rentals ({shiftSummary.rentalsCount})</h3>
				<div class="summary-stat">
					<span class="label">Cash:</span>
					<span class="value">${shiftSummary.rentalsCash.toFixed(2)}</span>
				</div>
				<div class="summary-stat">
					<span class="label">Credit:</span>
					<span class="value">${shiftSummary.rentalsCredit.toFixed(2)}</span>
				</div>
				{#if shiftSummary.storeSalesCount > 0}
					<h3>Store Sales ({shiftSummary.storeSalesCount})</h3>
					<div class="summary-stat">
						<span class="label">Total:</span>
						<span class="value">${shiftSummary.storeSalesTotal.toFixed(2)}</span>
					</div>
				{/if}
				<h3>Totals</h3>
				<div class="summary-stat total">
					<span class="label">Cash:</span>
					<span class="value">${shiftSummary.totalCash.toFixed(2)}</span>
				</div>
				<div class="summary-stat total">
					<span class="label">Credit:</span>
					<span class="value">${shiftSummary.totalCredit.toFixed(2)}</span>
				</div>
			</div>
			<div class="modal-actions">
				<md-outlined-button onclick={() => { showShiftSummary = false; }}>Cancel</md-outlined-button>
				<md-filled-button class="danger-btn" onclick={() => { showShiftSummary = false; executeEndShift(); }}>End Shift & Download Report</md-filled-button>
			</div>
		</div>
	</div>
{/if}

{#if showStoreSaleModal}
	<div class="modal-overlay" onclick={() => { showStoreSaleModal = false; }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Store Sale</h2>
				<button class="close-modal" onclick={() => { showStoreSaleModal = false; }}>x</button>
			</div>
			<div class="form-section">
				<label>Product</label>
				<select bind:value={selectedStoreProductId} disabled={loading}>
					<option value={null}>Select a product...</option>
					{#each data.storeProducts as product}
						<option value={product.id}>{product.name} - ${(product.price / 100).toFixed(2)} ({product.quantity} in stock)</option>
					{/each}
				</select>
			</div>
			<div class="form-section">
				<label>Quantity</label>
				<input
					type="number"
					min="1"
					bind:value={saleQuantity}
					disabled={loading}
					style="width: 100%; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px;"
				/>
			</div>
			{#if saleError}
				<p class="error">{saleError}</p>
			{/if}
			<div class="modal-actions">
				<md-outlined-button onclick={() => { showStoreSaleModal = false; }} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={createStoreSale} disabled={loading}>Complete Sale</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<CloseRentalModal
	bind:open={closeRentalModalOpen}
	rental={selectedRentalToClose}
	onClose={executeCloseRental}
	onCancel={() => { closeRentalModalOpen = false; }}
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
	.app-shell { display: flex; flex-direction: column; height: 100vh; }
	.app-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: var(--md-sys-color-surface-container); border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.app-header h1 { font-size: 1.5rem; font-weight: 500; color: var(--md-sys-color-on-surface); }
	.header-right { display: flex; align-items: center; gap: 1rem; }
	.header-error { color: var(--md-sys-color-error); font-size: 0.875rem; padding: 0.5rem; background: var(--md-sys-color-error-container); border-radius: 0.25rem; }
	.operator-badge { padding: 0.5rem 1rem; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border-radius: 1rem; font-weight: 500; }
	.app-main { flex: 1; overflow: hidden; }
	.rentals-panel { padding: 1.5rem; overflow-y: auto; height: 100%; }
	.rentals-panel h2 { margin-bottom: 1rem; font-size: 1.25rem; font-weight: 500; }
	.action-buttons { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
	.rentals-list { display: flex; flex-direction: column; gap: 1rem; }
	.rental-card { padding: 1rem; background: var(--md-sys-color-surface); border: 1px solid var(--md-sys-color-outline-variant); border-radius: 0.5rem; }
	.rental-card.completed { opacity: 0.7; border-color: var(--md-sys-color-outline); }
	.rental-customer { font-weight: 500; margin-bottom: 0.5rem; }
	.hotel-name { font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant); }
	.rental-items, .rental-time { font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 0.5rem; }
	.rental-type { font-size: 0.875rem; margin-bottom: 0.5rem; }
	.rental-price { font-size: 1.125rem; font-weight: 600; color: var(--md-sys-color-primary); margin-top: 0.5rem; }
	.close-btn { padding: 0.5rem 1rem; background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; }
	.close-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.form-section { margin-bottom: 1.5rem; }
	.form-section label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
	.form-section select { width: 100%; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); }
	.equipment-item { margin-bottom: 1rem; }
	.search-input { width: 100%; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px; }
	.tracked-list { border: 1px solid var(--md-sys-color-outline); border-radius: 4px; max-height: 150px; overflow-y: auto; margin-top: 0.5rem; }
	.tracked-option { padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.tracked-option:hover { background: var(--md-sys-color-surface-variant); }
	.selected-item { font-size: 0.875rem; color: var(--md-sys-color-primary); }
	.customer-fields { display: flex; flex-direction: column; gap: 1rem; }
	.rental-type-options { display: flex; gap: 1rem; }
	.error { color: var(--md-sys-color-error); }
	.unavailable { opacity: 0.5; }
	.out-of-stock { color: var(--md-sys-color-error); font-size: 0.75rem; }
	.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
	.modal-content { background: var(--md-sys-color-surface); border-radius: 1rem; padding: 2rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
	.close-modal { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
	.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; }
	.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: var(--md-sys-color-surface-container-low); }
	.login-card { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 3rem; background: var(--md-sys-color-surface); border-radius: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); }
	.login-card h1 { font-size: 2rem; font-weight: 500; color: var(--md-sys-color-on-surface); }
	.login-card p { color: var(--md-sys-color-on-surface-variant); }
	.login-card a { text-decoration: none; }
	.shift-summary-content { margin-bottom: 1.5rem; }
	.shift-summary-content h3 { font-size: 0.875rem; font-weight: 600; color: var(--md-sys-color-on-surface-variant); margin: 1rem 0 0.5rem 0; text-transform: uppercase; }
	.shift-summary-content h3:first-child { margin-top: 0; }
	.summary-stat { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--md-sys-color-surface-container); border-radius: 0.5rem; margin-bottom: 0.5rem; }
	.summary-stat .label { font-weight: 500; color: var(--md-sys-color-on-surface); }
	.summary-stat .value { font-size: 1.25rem; font-weight: 600; color: var(--md-sys-color-primary); }
	.summary-stat.total { background: var(--md-sys-color-primary-container); }
	.summary-stat.total .label { color: var(--md-sys-color-on-primary-container); }
	.summary-stat.total .value { color: var(--md-sys-color-on-primary-container); }
	.danger-btn { --md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error); }
	.selected-tracked { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 500; }
</style>
