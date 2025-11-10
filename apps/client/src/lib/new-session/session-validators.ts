export interface ValidationResult {
	valid: boolean;
	error: string | null;
}

function createValidator<T>(
	checks: Array<{ test: (val: T) => boolean; error: string }>,
): (val: T) => ValidationResult {
	return function validate(val: T): ValidationResult {
		const failed = checks.find(function checkFailed(check) {
			return !check.test(val);
		});
		return failed ? { valid: false, error: failed.error } : { valid: true, error: null };
	};
}

function isNotEmpty(s: string): boolean {
	return s.trim().length > 0;
}

function hasMinLength(min: number): (s: string) => boolean {
	return function checkMinLength(s: string): boolean {
		return s.trim().length >= min;
	};
}

function hasMaxLength(max: number): (s: string) => boolean {
	return function checkMaxLength(s: string): boolean {
		return s.trim().length <= max;
	};
}

function startsWithPrefix(prefix: string): (s: string) => boolean {
	return function checkPrefix(s: string): boolean {
		return s.trim().startsWith(prefix);
	};
}

export const validateUsername = createValidator<string>([
	{ test: isNotEmpty, error: 'Username is required' },
	{ test: hasMinLength(2), error: 'Username must be at least 2 characters' },
	{ test: hasMaxLength(20), error: 'Username must be less than 20 characters' },
]);

export const validateSlug = createValidator<string>([
	{ test: isNotEmpty, error: 'Session code is required' },
	{ test: startsWithPrefix('s_'), error: 'Invalid session code format' },
]);
