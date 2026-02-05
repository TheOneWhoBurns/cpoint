<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/checkbox/checkbox.js';
	import { untrack } from 'svelte';
	import GuideSelector from './GuideSelector.svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';

	type EquipmentItem = { type: string; itemId?: number; categoryId?: number; name: string; quantity?: number };

	let {
		open = $bindable(false),
		products,
		trackedItems,
		categories,
		guides,
		loading = $bindable(false),
		onSubmit,
		onVerifyPin
	}: {
		open: boolean;
		products: any[];
		trackedItems: any[];
		categories: any[];
		guides: any[];
		loading?: boolean;
		onSubmit: (data: any) => Promise<void>;
		onVerifyPin: (guideId: number, pin: string) => Promise<boolean>;
	} = $props();

	let reservationProductId = $state<number | null>(null);
	let reservationTrackedItems = $state<Record<number, number[]>>({});
	let reservationIncludedGenericItems = $state<Record<number, boolean>>({});
	let reservationSearchQueries = $state<Record<number, string>>({});
	let reservationQuantity = $state(1);
	let reservationCustomerName = $state('');
	let reservationCustomerHotel = $state('');
	let reservationCustomerPhone = $state('');
	let reservationReason = $state('');
	let reservationFrom = $state('');
	let reservationUntil = $state('');
	let reservationGuideId = $state<number | null>(null);
	let reservationError = $state('');
	let reservationFromInput = $state<HTMLInputElement | null>(null);
	let reservationUntilInput = $state<HTMLInputElement | null>(null);
	let reservationFromPicker: flatpickr.Instance | null = null;
	let reservationUntilPicker: flatpickr.Instance | null = null;

	const reservationProduct = $derived(reservationProductId ? products.find((p: any) => p.id === reservationProductId) : null);
	const reservationEquipment = $derived<EquipmentItem[]>(reservationProduct?.equipment as EquipmentItem[] ?? []);

	function getCategoryAvailability(categoryId: number) {
		const cat = categories.find((c: any) => c.id === categoryId);
		return cat?.availableQuantity ?? 0;
	}

	function getFilteredTrackedItems(categoryId: number) {
		const items = trackedItems.filter((t: any) => t.productTypeId === categoryId && t.status === 'available');
		const query = reservationSearchQueries[categoryId];
		if (!query) return items;
		return items.filter((t: any) => t.code.toLowerCase().includes(query.toLowerCase()));
	}

	function initReservationProductForm(product: any) {
		if (!product) return;
		const equipment = (product.equipment as EquipmentItem[]) ?? [];
		reservationTrackedItems = {};
		reservationIncludedGenericItems = {};
		reservationSearchQueries = {};
		for (const item of equipment) {
			if (item.type === 'tracked') {
				reservationSearchQueries[item.categoryId ?? 0] = '';
			} else if (item.type === 'generic') {
				const available = getCategoryAvailability(item.categoryId ?? 0);
				const needed = item.quantity ?? 1;
				reservationIncludedGenericItems[item.categoryId ?? 0] = available >= needed;
			}
		}
	}

	$effect(() => {
		if (reservationProductId) {
			untrack(() => initReservationProductForm(reservationProduct));
		}
	});

	function initFlatpickr() {
		if (reservationFromInput && !reservationFromPicker) {
			reservationFromPicker = flatpickr(reservationFromInput, {
				enableTime: true, dateFormat: 'Y-m-d H:i', minDate: 'today',
				onChange: (dates) => { if (dates[0]) reservationFrom = dates[0].toISOString(); }
			});
		}
		if (reservationUntilInput && !reservationUntilPicker) {
			reservationUntilPicker = flatpickr(reservationUntilInput, {
				enableTime: true, dateFormat: 'Y-m-d H:i', minDate: 'today',
				onChange: (dates) => { if (dates[0]) reservationUntil = dates[0].toISOString(); }
			});
		}
	}

	function destroyFlatpickr() {
		reservationFromPicker?.destroy();
		reservationFromPicker = null;
		reservationUntilPicker?.destroy();
		reservationUntilPicker = null;
	}

	$effect(() => {
		if (open) {
			reservationError = '';
			reservationProductId = null;
			reservationTrackedItems = {};
			reservationIncludedGenericItems = {};
			reservationSearchQueries = {};
			reservationQuantity = 1;
			reservationCustomerName = '';
			reservationCustomerHotel = '';
			reservationCustomerPhone = '';
			reservationReason = '';
			reservationFrom = '';
			reservationUntil = '';
			reservationGuideId = null;
			setTimeout(initFlatpickr, 0);
		}
	});

	function close() {
		open = false;
		destroyFlatpickr();
	}

	async function handleSubmit() {
		if (!reservationProductId) { reservationError = 'Select a product'; return; }
		if (!reservationFrom || !reservationUntil) { reservationError = 'Start and end times required'; return; }

		const equipment = reservationEquipment;
		for (const item of equipment.filter(e => e.type === 'tracked')) {
			const selectedIds = reservationTrackedItems[item.categoryId ?? 0] || [];
			if (selectedIds.length !== reservationQuantity) {
				reservationError = `Select ${reservationQuantity} items for ${item.name}`;
				return;
			}
		}

		const resItems = equipment.map(item => {
			if (item.type === 'tracked') {
				const selectedIds = reservationTrackedItems[item.categoryId ?? 0] || [];
				return selectedIds.map(selectedId => {
					const selected = trackedItems.find((t: any) => t.id === selectedId);
					return { type: 'tracked', itemId: selectedId, code: selected?.code, name: item.name, categoryId: item.categoryId };
				});
			}
			if (!reservationIncludedGenericItems[item.categoryId ?? 0]) return null;
			return { type: 'generic', categoryId: item.categoryId, name: item.name, quantity: (item.quantity ?? 1) * reservationQuantity };
		}).flat().filter(Boolean);

		if (resItems.length === 0) { reservationError = 'Select at least one equipment item'; return; }

		reservationError = '';
		try {
			await onSubmit({
				items: resItems,
				customer: reservationCustomerName ? { name: reservationCustomerName, hotel: reservationCustomerHotel, phone: reservationCustomerPhone } : null,
				reason: reservationReason || null,
				reservedFrom: reservationFrom,
				reservedUntil: reservationUntil,
				guideId: reservationGuideId || null
			});
			close();
		} catch (e: any) {
			reservationError = e.message || 'Failed to create reservation';
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content large" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">event</span>
					<h2 class="md-headline-small">New Reservation</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">category</span>
						<span class="md-title-small">Select Product</span>
					</label>
					<select class="form-select" bind:value={reservationProductId} disabled={loading}>
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
						<button class="qty-btn" onclick={() => reservationQuantity = Math.max(1, reservationQuantity - 1)} disabled={loading || reservationQuantity <= 1} aria-label="Decrease quantity">
							<span class="material-symbols-rounded">remove</span>
						</button>
						<span class="qty-value md-title-large">{reservationQuantity}</span>
						<button class="qty-btn" onclick={() => reservationQuantity = Math.min(10, reservationQuantity + 1)} disabled={loading || reservationQuantity >= 10} aria-label="Increase quantity">
							<span class="material-symbols-rounded">add</span>
						</button>
					</div>
				</div>
				{#if reservationProduct}
					<div class="form-section">
						<label class="form-label">
							<span class="material-symbols-rounded">handyman</span>
							<span class="md-title-small">Equipment</span>
						</label>
						<div class="equipment-list">
							{#each reservationEquipment as item}
								{#if item.type === 'tracked'}
									<div class="equipment-card tracked">
										<div class="equipment-header">
											<span class="material-symbols-rounded">qr_code_2</span>
											<span class="md-body-medium">{item.name}</span>
											<span class="need-badge">need {reservationQuantity}</span>
										</div>
										<input type="text" placeholder="Search by code..." value={reservationSearchQueries[item.categoryId ?? 0] || ''} oninput={(e) => reservationSearchQueries[item.categoryId ?? 0] = e.currentTarget.value} class="search-input" />
										{#if getFilteredTrackedItems(item.categoryId ?? 0).length > 0}
											<div class="tracked-items-grid">
												{#each getFilteredTrackedItems(item.categoryId ?? 0) as available}
													{@const isSelected = reservationTrackedItems[item.categoryId ?? 0]?.includes(available.id)}
													<button class="tracked-item-btn" class:selected={isSelected} onclick={() => {
														const ids = reservationTrackedItems[item.categoryId ?? 0] || [];
														if (ids.includes(available.id)) { reservationTrackedItems[item.categoryId ?? 0] = ids.filter(id => id !== available.id); }
														else if (ids.length < reservationQuantity) { reservationTrackedItems[item.categoryId ?? 0] = [...ids, available.id]; }
														reservationTrackedItems = reservationTrackedItems;
													}} disabled={!isSelected && (reservationTrackedItems[item.categoryId ?? 0]?.length ?? 0) >= reservationQuantity} aria-pressed={isSelected}>
														<span class="material-symbols-rounded">{isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
														<span class="md-label-large">{available.code}</span>
													</button>
												{/each}
											</div>
										{:else}
											<p class="no-items md-body-small">No items available</p>
										{/if}
										{#if (reservationTrackedItems[item.categoryId ?? 0] || []).length > 0}
											<div class="selected-summary">
												<span class="material-symbols-rounded">check</span>
												<span class="md-body-small">Selected ({(reservationTrackedItems[item.categoryId ?? 0] || []).length}/{reservationQuantity}): {(reservationTrackedItems[item.categoryId ?? 0] || []).map(id => trackedItems.find((t: any) => t.id === id)?.code).join(', ')}</span>
											</div>
										{/if}
									</div>
								{:else}
									{@const available = getCategoryAvailability(item.categoryId ?? 0)}
									{@const needed = (item.quantity ?? 1) * reservationQuantity}
									{@const canInclude = available >= needed}
									<div class="equipment-card generic" class:unavailable={!canInclude}>
										<label class="generic-checkbox">
											<md-checkbox checked={reservationIncludedGenericItems[item.categoryId ?? 0] && canInclude} onchange={(e: Event) => reservationIncludedGenericItems[item.categoryId ?? 0] = (e.target as HTMLInputElement).checked} disabled={!canInclude}></md-checkbox>
											<span class="material-symbols-rounded">inventory_2</span>
											<span class="md-body-medium">{item.name} x{needed}</span>
											{#if !canInclude}
												<span class="stock-warning"><span class="material-symbols-rounded icon-xs">warning</span> Only {available} available</span>
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
						<span class="material-symbols-rounded">date_range</span>
						<span class="md-title-small">Reservation Period</span>
					</label>
					<div class="reservation-dates-inputs">
						<div class="date-input-group">
							<label class="md-body-small">From</label>
							<input type="text" class="flatpickr-input form-date-input" placeholder="Select start date/time..." bind:this={reservationFromInput} disabled={loading} readonly />
						</div>
						<div class="date-input-group">
							<label class="md-body-small">Until</label>
							<input type="text" class="flatpickr-input form-date-input" placeholder="Select end date/time..." bind:this={reservationUntilInput} disabled={loading} readonly />
						</div>
					</div>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">person</span>
						<span class="md-title-small">Customer / Contact (optional)</span>
					</label>
					<div class="customer-form-grid">
						<md-outlined-text-field label="Name" value={reservationCustomerName} oninput={(e: Event) => reservationCustomerName = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">badge</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Hotel" value={reservationCustomerHotel} oninput={(e: Event) => reservationCustomerHotel = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">hotel</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Phone" type="tel" value={reservationCustomerPhone} oninput={(e: Event) => reservationCustomerPhone = (e.target as HTMLInputElement).value} disabled={loading}>
							<span class="material-symbols-rounded" slot="leading-icon">phone</span>
						</md-outlined-text-field>
					</div>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">note</span>
						<span class="md-title-small">Reason</span>
					</label>
					<md-outlined-text-field label="e.g. VIP tour, Influencer collab..." value={reservationReason} oninput={(e: Event) => reservationReason = (e.target as HTMLInputElement).value} disabled={loading}>
						<span class="material-symbols-rounded" slot="leading-icon">description</span>
					</md-outlined-text-field>
				</div>
				{#if reservationProduct?.requiresGuide}
					<div class="form-section">
						<GuideSelector {guides} bind:selectedGuideId={reservationGuideId} {loading} onVerifyPin={onVerifyPin} />
					</div>
				{/if}
				{#if reservationError}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{reservationError}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleSubmit} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">event</span>
					Create Reservation
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-content.large { max-width: 700px; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title .material-symbols-rounded { font-size: 32px; color: var(--md-sys-color-primary); }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.form-section { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.form-label { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-title-small); }
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); }
	.form-select { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-select:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.quantity-control { display: flex; align-items: center; gap: var(--md-sys-spacing-lg); padding-top: var(--md-sys-spacing-sm); }
	.qty-btn { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--md-sys-color-surface-container-high); border: none; border-radius: var(--md-sys-shape-corner-full); color: var(--md-sys-color-on-surface); cursor: pointer; flex-shrink: 0; transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard); }
	.qty-btn:hover:not(:disabled) { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
	.qty-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.qty-value { flex: 1; text-align: center; color: var(--md-sys-color-on-surface); }
	.equipment-list { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.equipment-card { background: var(--md-sys-color-surface-container-low); border: 1px solid var(--md-sys-color-outline-variant); border-radius: var(--md-sys-shape-corner-medium); padding: var(--md-sys-spacing-md); }
	.equipment-card.unavailable { opacity: 0.6; }
	.equipment-header { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); margin-bottom: var(--md-sys-spacing-md); }
	.equipment-header .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); }
	.need-badge { margin-left: auto; padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm); background: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); border-radius: var(--md-sys-shape-corner-small); font: var(--md-sys-typescale-label-small); }
	.search-input { width: 100%; padding: var(--md-sys-spacing-sm); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-medium); margin-bottom: var(--md-sys-spacing-sm); }
	.search-input:focus { outline: none; border-color: var(--md-sys-color-primary); }
	.tracked-items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--md-sys-spacing-sm); max-height: 150px; overflow-y: auto; }
	.tracked-item-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-xl); min-height: 44px; background: var(--md-sys-color-surface); border: 1px solid var(--md-sys-color-outline-variant); border-radius: var(--md-sys-shape-corner-small); cursor: pointer; transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard); }
	.tracked-item-btn:hover:not(:disabled) { background: var(--md-sys-color-surface-container); }
	.tracked-item-btn.selected { background: var(--md-sys-color-primary-container); border-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary-container); }
	.tracked-item-btn:disabled { opacity: 0.38; cursor: not-allowed; }
	.tracked-item-btn .material-symbols-rounded { font-size: 20px; }
	.no-items { color: var(--md-sys-color-on-surface-variant); text-align: center; padding: var(--md-sys-spacing-md); }
	.selected-summary { display: flex; align-items: center; gap: var(--md-sys-spacing-xs); padding: var(--md-sys-spacing-sm); background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border-radius: var(--md-sys-shape-corner-small); margin-top: var(--md-sys-spacing-sm); }
	.selected-summary .material-symbols-rounded { font-size: 18px; }
	.generic-checkbox { display: flex; align-items: center; gap: var(--md-sys-spacing-md); cursor: pointer; }
	.generic-checkbox .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); }
	.generic-checkbox md-checkbox { flex-shrink: 0; }
	.stock-warning { display: flex; align-items: center; gap: var(--md-sys-spacing-xs); margin-left: auto; color: var(--md-sys-color-error); font: var(--md-sys-typescale-label-small); }
	.reservation-dates-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--md-sys-spacing-md); }
	.date-input-group { display: flex; flex-direction: column; gap: var(--md-sys-spacing-xs); }
	.date-input-group label { color: var(--md-sys-color-on-surface-variant); }
	.form-date-input { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-date-input:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.customer-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--md-sys-spacing-md); }
	.customer-form-grid md-outlined-text-field { width: 100%; }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	.icon-xs { font-size: 14px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@media (max-width: 768px) {
		.customer-form-grid { grid-template-columns: 1fr; }
		.reservation-dates-inputs { grid-template-columns: 1fr; }
		.modal-content.large { max-width: 100%; }
	}
</style>
