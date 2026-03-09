package line

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// AuthVerifier implements domain.AuthVerifier using the LINE OAuth2 verify endpoint.
type AuthVerifier struct {
	channelID  string
	httpClient *http.Client
}

func NewAuthVerifier(channelID string) *AuthVerifier {
	return &AuthVerifier{
		channelID:  channelID,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (v *AuthVerifier) Verify(_ context.Context, token string) error {
	url := fmt.Sprintf("https://api.line.me/oauth2/v2.1/verify?access_token=%s", token)
	resp, err := v.httpClient.Get(url)
	if err != nil {
		log.Printf("[AUTH] LIFF token verify request failed: %v", err)
		return fmt.Errorf("token verification failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("invalid access token")
	}

	if v.channelID != "" {
		var result struct {
			ClientID string `json:"client_id"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err == nil {
			if result.ClientID != v.channelID {
				return fmt.Errorf("token not issued for this app")
			}
		}
	}

	return nil
}
