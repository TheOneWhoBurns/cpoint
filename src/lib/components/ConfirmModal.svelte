<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';

	type Variant = 'default' | 'danger' | 'warning';

	let {
		open = $bindable(false),
		title = 'Confirm',
		message = '',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {},
		variant = 'default' as Variant
	} = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content" class:danger={variant === 'danger'} class:warning={variant === 'warning'}>
			<div class="modal-header">
				<h2>{title}</h2>
			</div>
			<div class="modal-body">
				<p>{message}</p>
			</div>
			<div class="modal-actions">
				<md-outlined-button onclick={handleCancel}>{cancelText}</md-outlined-button>
				{#if variant === 'danger'}
					<md-filled-button class="danger-btn" onclick={handleConfirm}>{confirmText}</md-filled-button>
				{:else}
					<md-filled-button onclick={handleConfirm}>{confirmText}</md-filled-button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
	}
	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
	}
	.modal-content.danger .modal-header h2 {
		color: var(--md-sys-color-error);
	}
	.modal-content.warning .modal-header h2 {
		color: var(--md-sys-color-tertiary, #7d5260);
	}
	.modal-header {
		margin-bottom: 1rem;
	}
	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}
	.modal-body {
		margin-bottom: 1.5rem;
	}
	.modal-body p {
		margin: 0;
		color: var(--md-sys-color-on-surface-variant);
		line-height: 1.5;
	}
	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
	.danger-btn {
		--md-filled-button-container-color: var(--md-sys-color-error);
		--md-filled-button-label-text-color: var(--md-sys-color-on-error);
	}
</style>
