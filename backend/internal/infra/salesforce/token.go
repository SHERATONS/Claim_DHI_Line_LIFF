package salesforce

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const tokenBuffer = 5 * time.Minute

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	IssuedAt    string `json:"issued_at"`
	InstanceURL string `json:"instance_url"`
}

func (c *Client) getToken() (*tokenResponse, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.cachedToken != nil && time.Now().Before(c.tokenExpiry) {
		log.Printf("[Salesforce] Using cached token (expires in %v)", time.Until(c.tokenExpiry).Round(time.Second))
		return c.cachedToken, nil
	}

	token, err := c.fetchToken()
	if err != nil {
		return nil, err
	}

	c.cachedToken = token
	c.tokenExpiry = computeExpiry(token.IssuedAt)
	log.Printf("[Salesforce] Fetched new token (expires at %v)", c.tokenExpiry.Format("15:04:05"))
	return c.cachedToken, nil
}

func (c *Client) invalidateToken() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cachedToken = nil
	c.tokenExpiry = time.Time{}
}

func computeExpiry(issuedAtStr string) time.Time {
	issuedAtMs, err := strconv.ParseInt(issuedAtStr, 10, 64)
	if err != nil || issuedAtMs == 0 {
		log.Printf("[Salesforce] Could not parse issued_at=%q, using fallback expiry", issuedAtStr)
		return time.Now().Add(55 * time.Minute)
	}
	return time.UnixMilli(issuedAtMs).Add(time.Hour - tokenBuffer)
}

func (c *Client) fetchToken() (*tokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", c.cfg.ClientID)
	data.Set("client_secret", c.cfg.ClientSecret)

	req, err := http.NewRequest("POST", c.cfg.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send token request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("salesforce token returned status %d: %s", resp.StatusCode, string(body))
	}

	var token tokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}
	return &token, nil
}
