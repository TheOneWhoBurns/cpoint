<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		open = $bindable(false),
		target = null as { type: string; id: number; label: string } | null,
		onDelete
	}: {
		open: boolean;
		target: { type: string; id: number; label: string } | null;
		onDelete: (type: string, id: number, passcode: string) => Promise<void>;
	} = $props();

	let passcode = $state('');
	let error = $state('');
	let deleting = $state(false);

	function close() {
		if (deleting) return;
		open = false;
		passcode = '';
		error = '';
	}

	async function submit() {
		if (!target || passcode.length !== 4) {
			error = 'Enter 4-digit passcode';
			return;
		}
		deleting = true;
		error = '';
		try {
			await onDelete(target.type, target.id, passcode);
			close();
		} catch (e: any) {
			error = e.message || 'Delete failed';
		}
		deleting = false;
	}
</script>

{#if open && target}
	<div class="modal-overlay" onclick={close}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded" style="color: var(--md-sys-color-error)">delete</span>
					<h2 id="delete-modal-title" class="md-headline-small">Delete {target.label}?</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<p class="md-body-medium">This action requires passcode verification. The item will be marked as deleted but kept in records for the shift report.</p>
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">lock</span>
						<span class="md-title-small">Enter Passcode</span>
					</label>
					<input
						type="password"
						maxlength="4"
						inputmode="numeric"
						placeholder="4-digit passcode"
						bind:value={passcode}
						class="passcode-input"
						onkeydown={(e) => { if (e.key === 'Enter') submit(); }}
					/>
					{#if error}
						<div class="error-banner">
							<span class="material-symbols-rounded">error</span>
							<span class="md-body-medium">{error}</span>
						</div>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={deleting}>Cancel</md-outlined-button>
				<md-filled-button class="danger-btn" onclick={submit} disabled={deleting || passcode.length !== 4}>
					<span class="material-symbols-rounded" slot="icon">delete</span>
					Delete
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 200; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title .material-symbols-rounded { font-size: 32px; }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-body p { margin: 0; color: var(--md-sys-color-on-surface-variant); }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.form-section { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.form-label { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-title-small); }
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.passcode-input { width: 100%; padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); font: var(--md-sys-typescale-title-medium); text-align: center; letter-spacing: 0.5em; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); }
	.passcode-input:focus { outline: none; border-color: var(--md-sys-color-primary); border-width: 2px; }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	.danger-btn { --md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error); }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@media (max-width: 768px) {
		.modal-content { max-width: 100%; max-height: 95vh; border-radius: var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0 0; margin-top: auto; }
		.modal-overlay { align-items: flex-end; padding: 0; }
	}
</style>
