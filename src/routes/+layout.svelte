<script lang="ts">
	import '../app.css';
	import { shiftStore } from '$lib/stores/shift';

	let { children, data } = $props();

	$effect(() => {
		if (data.operator && data.shift) {
			shiftStore.setSession(data.operator, data.shift);
		} else {
			shiftStore.clearSession();
		}
	});
</script>

<svelte:head>
	<title>Rental Manager</title>
</svelte:head>

{@render children()}
