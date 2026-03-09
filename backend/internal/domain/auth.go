package domain

import "context"

// AuthVerifier verifies an access token.
// Returns nil if the token is valid, a descriptive error otherwise.
type AuthVerifier interface {
	Verify(ctx context.Context, token string) error
}
