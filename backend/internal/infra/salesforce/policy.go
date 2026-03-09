package salesforce

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain"
)

type PolicyRepo struct{ client *Client }

func NewPolicyRepo(c *Client) *PolicyRepo { return &PolicyRepo{client: c} }

type sfPolicyRequest struct {
	PolicyNo string `json:"policyNo"`
}

type sfPolicyResponse struct {
	Success bool          `json:"success"`
	Data    *sfPolicyData `json:"data,omitempty"`
	Error   string        `json:"error,omitempty"`
}

type sfPolicyData struct {
	PolicyNumber    string `json:"policyNumber"`
	PolicyId        string `json:"policyId"`
	IsPersonAccount bool   `json:"isPersonAccount"`
	AccountName     string `json:"accountName"`
	AccountId       string `json:"accountId"`
}

func (r *PolicyRepo) LookupPolicy(_ context.Context, policyNo string) (*domain.Policy, error) {
	reqURL := fmt.Sprintf("%s/services/apexrest/liff/policy", r.client.cfg.InstanceURL)
	log.Printf("[Policy] Looking up policyNo=%s", policyNo)

	jsonBody, err := json.Marshal(sfPolicyRequest{PolicyNo: policyNo})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	body, err := r.client.callSFAPI(func(accessToken string) (*http.Request, error) {
		req, err := http.NewRequest("POST", reqURL, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		return req, nil
	})
	if err != nil {
		return nil, fmt.Errorf("policy lookup failed: %w", err)
	}

	var resp sfPolicyResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	if !resp.Success || resp.Data == nil {
		errMsg := "policy lookup failed"
		if resp.Error != "" {
			errMsg = resp.Error
		}
		return nil, fmt.Errorf("%s", errMsg)
	}

	log.Printf("[Policy] Result: success=%v, policyId=%s", resp.Success, resp.Data.PolicyId)

	return &domain.Policy{
		PolicyNumber:    resp.Data.PolicyNumber,
		PolicyId:        resp.Data.PolicyId,
		IsPersonAccount: resp.Data.IsPersonAccount,
		AccountName:     resp.Data.AccountName,
		AccountId:       resp.Data.AccountId,
	}, nil
}
