<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';

	let {
		open = $bindable(false),
		reservation = null as any,
		loading = false,
		onSave
	}: {
		open: boolean;
		reservation: any;
		loading?: boolean;
		onSave: (id: number, data: { customer: object; reason: string; reservedFrom?: string; reservedUntil?: string }) => Promise<void>;
	} = $props();

	let customerName = $state('');
	let customerHotel = $state('');
	let reason = $state('');
	let fromDate = $state('');
	let untilDate = $state('');
	let error = $state('');
	let saving = $state(false);
	let fromInput = $state<HTMLInputElement | null>(null);
	let untilInput = $state<HTMLInputElement | null>(null);
	let fromPicker: flatpickr.Instance | null = null;
	let untilPicker: flatpickr.Instance | null = null;

	$effect(() => {
		if (open && reservation) {
			const customer = reservation.customer as { name?: string; hotel?: string } | null;
			customerName = customer?.name || '';
			customerHotel = customer?.hotel || '';
			reason = reservation.reason || '';
			fromDate = reservation.reservedFrom ? new Date(reservation.reservedFrom).toISOString().slice(0, 16) : '';
			untilDate = reservation.reservedUntil ? new Date(reservation.reservedUntil).toISOString().slice(0, 16) : '';
			error = '';
		}
	});

	$effect(() => {
		if (open && fromInput) {
			fromPicker = flatpickr(fromInput, {
				enableTime: true, dateFormat: 'Y-m-d H:i', defaultDate: fromDate || undefined,
				onChange: ([date]) => { if (date) fromDate = date.toISOString(); }
			});
		}
		return () => { fromPicker?.destroy(); };
	});

	$effect(() => {
		if (open && untilInput) {
			untilPicker = flatpickr(untilInput, {
				enableTime: true, dateFormat: 'Y-m-d H:i', defaultDate: untilDate || undefined,
				onChange: ([date]) => { if (date) untilDate = date.toISOString(); }
			});
		}
		return () => { untilPicker?.destroy(); };
	});

	function close() {
		if (saving) return;
		open = false;
	}

	async function submit() {
		if (!reservation) return;
		saving = true;
		error = '';
		try {
			await onSave(reservation.id, {
				customer: { name: customerName, hotel: customerHotel },
				reason,
				reservedFrom: fromDate || undefined,
				reservedUntil: untilDate || undefined
			});
			close();
		} catch (e: any) {
			error = e.message || 'Failed to update';
		}
		saving = false;
	}
</script>

{#if open && reservation}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-res-title">
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">event</span>
					<h2 id="edit-res-title" class="md-headline-small">Edit Reservation</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">person</span>
						<span class="md-title-small">Customer</span>
					</label>
					<div class="customer-form-grid">
						<md-outlined-text-field label="Name" value={customerName} oninput={(e: Event) => customerName = (e.target as HTMLInputElement).value} disabled={loading || saving}>
							<span class="material-symbols-rounded" slot="leading-icon">badge</span>
						</md-outlined-text-field>
						<md-outlined-text-field label="Hotel" value={customerHotel} oninput={(e: Event) => customerHotel = (e.target as HTMLInputElement).value} disabled={loading || saving}>
							<span class="material-symbols-rounded" slot="leading-icon">hotel</span>
						</md-outlined-text-field>
					</div>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">info</span>
						<span class="md-title-small">Reason</span>
					</label>
					<md-outlined-text-field label="Reason" value={reason} oninput={(e: Event) => reason = (e.target as HTMLInputElement).value} disabled={loading || saving}></md-outlined-text-field>
				</div>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">calendar_today</span>
						<span class="md-title-small">Reservation Period</span>
					</label>
					<div class="dates-grid">
						<input type="text" class="flatpickr-input form-date-input" placeholder="From..." bind:this={fromInput} disabled={loading || saving} readonly />
						<input type="text" class="flatpickr-input form-date-input" placeholder="Until..." bind:this={untilInput} disabled={loading || saving} readonly />
					</div>
				</div>
				{#if error}
					<div class="error-banner">
						<span class="material-symbols-rounded">error</span>
						<span class="md-body-medium">{error}</span>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={saving}>Cancel</md-outlined-button>
				<md-filled-button onclick={submit} disabled={saving}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Save Changes
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title .material-symbols-rounded { font-size: 32px; color: var(--md-sys-color-primary); }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.form-section { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.form-label { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-title-small); }
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.customer-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--md-sys-spacing-md); }
	.customer-form-grid md-outlined-text-field { width: 100%; }
	.dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--md-sys-spacing-md); }
	.form-date-input { width: 100%; padding: var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-body-large); cursor: pointer; }
	.form-date-input:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@media (max-width: 768px) {
		.modal-content { max-width: 100%; max-height: 95vh; border-radius: var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0 0; margin-top: auto; }
		.modal-overlay { align-items: flex-end; padding: 0; }
		.customer-form-grid, .dates-grid { grid-template-columns: 1fr; }
	}
</style>
