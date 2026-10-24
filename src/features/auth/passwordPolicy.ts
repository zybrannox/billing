// The password rule the backend enforces (app/password_policy.py) - kept in
// one place so every form that sets a password shows the same limit and the
// same message. The backend stays the authority; this just saves a round
// trip and gives instant feedback.
export const MIN_PASSWORD_LENGTH = 10;

export const passwordTooShortMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

export const passwordHint = `At least ${MIN_PASSWORD_LENGTH} characters. A short phrase of a few words works well.`;
