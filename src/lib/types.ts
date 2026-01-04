export interface Customer {
	name: string;
	phone: string;
	email?: string;
	notes?: string;
}

export interface RentalItem {
	type: 'tracked' | 'generic';
	itemId: number;
	code?: string;
	name: string;
	quantity?: number;
	rate: number;
}

export interface RentalPricing {
	type: 'hourly' | 'daily';
	subtotal: number;
	deposit: number;
	total: number;
}

export interface ProductPricing {
	hourlyRate?: number;
	dailyRate?: number;
	deposit?: number;
}

export interface ProductAttributes {
	sizes?: string[];
	colors?: string[];
	[key: string]: unknown;
}

export interface ItemAttributes {
	size?: string;
	color?: string;
	condition?: string;
	[key: string]: unknown;
}

export interface ShiftSummary {
	rentalsCount: number;
	revenue: number;
	notes?: string;
}
