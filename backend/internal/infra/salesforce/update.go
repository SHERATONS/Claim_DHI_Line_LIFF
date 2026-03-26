package salesforce

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type UpdateRepo struct{ client *Client }

func NewUpdateRepo(c *Client) *UpdateRepo { return &UpdateRepo{client: c} }

type sfUpdateBody struct {
	NotificationNo string `json:"notificationNo"`
	AiSummary      string `json:"aiSummary"`
}

func (r *UpdateRepo) UpdateCaseAnalysis(ctx context.Context, notificationNo, aiSummary string) error {
	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims/update", r.client.cfg.InstanceURL)
	
	body := sfUpdateBody{
		NotificationNo: notificationNo,
		AiSummary:      aiSummary,
	}
	
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal update body: %w", err)
	}

	_, err = r.client.callSFAPI(func(accessToken string) (*http.Request, error) {
		req, err := http.NewRequest("PATCH", reqURL, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		return req, nil
	})
	
	if err != nil {
		return fmt.Errorf("failed to call salesforce update api: %w", err)
	}

	return nil
}
