export interface Coordinates {
	x: number;
	y: number;
}

export interface Shot extends Coordinates {
	id: string;
	createdAt: Date;
	shooterId: string;
	targetId: string;
	hit: boolean;
	boatId?: string;
}
