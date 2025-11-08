export interface ValidationResult {
	valid: boolean;
	error: string | null;
}

export function validateUsername(username: string): ValidationResult {
	const trimmed = username.trim();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Username is required' };
	}
	if (trimmed.length < 2) {
		return { valid: false, error: 'Username must be at least 2 characters' };
	}
	if (trimmed.length > 20) {
		return { valid: false, error: 'Username must be less than 20 characters' };
	}

	return { valid: true, error: null };
}

export function validateSlug(slug: string): ValidationResult {
	const trimmed = slug.trim();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Session code is required' };
	}
	if (!trimmed.startsWith('s_')) {
		return { valid: false, error: 'Invalid session code format' };
	}

	return { valid: true, error: null };
}
