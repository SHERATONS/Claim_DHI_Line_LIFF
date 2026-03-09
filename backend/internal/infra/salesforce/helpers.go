package salesforce

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// callSFAPI executes a Salesforce API call with automatic token refresh on 401.
func (c *Client) callSFAPI(buildReq func(accessToken string) (*http.Request, error)) ([]byte, error) {
	makeCall := func() ([]byte, int, error) {
		token, err := c.getToken()
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get salesforce token: %w", err)
		}

		req, err := buildReq(token.AccessToken)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to build request: %w", err)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to send request: %w", err)
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, resp.StatusCode, fmt.Errorf("failed to read response: %w", err)
		}
		return body, resp.StatusCode, nil
	}

	body, status, err := makeCall()
	if err != nil {
		return nil, err
	}

	if status == http.StatusUnauthorized {
		c.invalidateToken()
		body, status, err = makeCall()
		if err != nil {
			return nil, err
		}
	}

	if status != http.StatusOK {
		log.Printf("[Salesforce] Non-200 response: status=%d body=%s", status, string(body))
		return nil, fmt.Errorf("salesforce returned status %d: %s", status, string(body))
	}

	return body, nil
}

// unmarshalSFResponse unmarshals a Salesforce response, handling double-encoded JSON.
func unmarshalSFResponse(body []byte, target interface{}) error {
	if err := json.Unmarshal(body, target); err == nil {
		return nil
	}
	var raw string
	if err := json.Unmarshal(body, &raw); err != nil {
		return fmt.Errorf("failed to parse SF response: %w", err)
	}
	if err := json.Unmarshal([]byte(raw), target); err != nil {
		return fmt.Errorf("failed to parse unwrapped SF response: %w", err)
	}
	return nil
}
