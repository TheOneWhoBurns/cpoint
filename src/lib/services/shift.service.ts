import { apiGet, apiPost } from './api';

export async function getShiftSummary(shiftId: number) {
	const res = await apiGet('/api/shifts/summary', { shiftId: String(shiftId) });
	return res.json();
}

export async function getClosingChecklist() {
	const res = await apiGet('/api/closing-checklist');
	const data = await res.json();
	return data.filter((item: any) => item.isActive !== false);
}

export async function endShift() {
	const res = await fetch('/api/shifts/close', { method: 'POST' });
	const contentType = res.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		const data = await res.json();
		if (data.url) {
			window.open(data.url, '_blank');
		}
		return data;
	}

	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	const disposition = res.headers.get('content-disposition') || '';
	const match = disposition.match(/filename="?([^"]+)"?/);
	a.download = match?.[1] || 'shift-report.xlsx';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	return { success: true };
}
