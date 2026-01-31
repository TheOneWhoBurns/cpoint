<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/radio/radio.js';

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

	interface Rental {
		id: number;
		items: RentalItem[];
		customer?: Customer;
		startedAt: string;
		pricing?: { type?: string; hourly?: number; fullDay?: number };
		returnNotes?: string;
	}

	let {
		open = $bindable(false),
		rental,
		onSave = () => {},
		onCancel = () => {}
	} = $props();

	let customerName = $state('');
	let customerHotel = $state('');
	let customerPhone = $state('');
	let customerId = $state('');
	let rentalType = $state('hourly');
	let notes = $state('');
	let loading = $state(false);
	let error = $state('');

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
		error = '';
	}

	async function handleSave() {
		if (!customerName.trim()) {
			error = 'Customer name is required';
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
			notes: notes.trim()
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

	const hasHourlyOption = $derived(!!rental?.pricing?.hourly);
	const hasFullDayOption = $derived(!!rental?.pricing?.fullDay);
</script>

{#if open && rental}
	<div class="modal-overlay" onclick={handleCancel}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-rental-title">
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
					<div class="info-row">
						<span class="material-symbols-rounded icon-sm">inventory_2</span>
						<span class="md-body-medium">
							{(rental.items as RentalItem[]).map(i => i.name + (i.code ? ` (${i.code})` : '')).join(', ')}
						</span>
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
		overflow-y: auto;
		animation: md-animate-scale-in 0.3s var(--md-sys-motion-easing-emphasized-decelerate);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		position: sticky;
		top: 0;
		background: var(--md-sys-color-surface);
		z-index: 1;
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
	}

	.modal-footer {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		justify-content: flex-end;
		padding: var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		position: sticky;
		bottom: 0;
		background: var(--md-sys-color-surface);
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

	/* Customer Form Grid */
	.customer-form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--md-sys-spacing-md);
	}

	.customer-form-grid md-outlined-text-field {
		width: 100%;
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
	}
</style>
