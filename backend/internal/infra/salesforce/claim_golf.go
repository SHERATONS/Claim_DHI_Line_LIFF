package salesforce

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain/claim"
)

type GolfClaimRepo struct{ client *Client }

func NewGolfClaimRepo(c *Client) *GolfClaimRepo { return &GolfClaimRepo{client: c} }

type sfGolfClaimBody struct {
	PolicyId         string `json:"policyId"`
	ContactId        string `json:"contactId"`
	NotifierName     string `json:"notifierName"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	IncidentDateTime string `json:"incidentDateTime"`
	Golfer           string `json:"golfer"`
	LossPlace        string `json:"lossPlace"`
	CauseOfLoss      string `json:"causeOfLoss"`
	LossReserve      string `json:"lossReserve"`
}

type sfGolfClaimResponse struct {
	Success bool             `json:"success"`
	Data    *sfGolfClaimData `json:"data,omitempty"`
	Error   string           `json:"error,omitempty"`
}

type sfGolfClaimData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (r *GolfClaimRepo) Submit(ctx context.Context, req claim.GolfClaimRequest) (*claim.ClaimResult, error) {
	policyRepo := NewPolicyRepo(r.client)
	policy, err := policyRepo.LookupPolicy(ctx, req.PolicyNo)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup policy: %w", err)
	}

	sfBody := sfGolfClaimBody{
		PolicyId:         policy.PolicyId,
		ContactId:        req.ContactId,
		NotifierName:     req.NotifierName,
		Phone:            req.Phone,
		Email:            req.Email,
		IncidentDateTime: req.IncidentDateTime,
		Golfer:           req.GolferName,
		LossPlace:        req.LossPlace,
		CauseOfLoss:      req.CauseOfLoss,
		LossReserve:      req.LossReserve,
	}

	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims/golf", r.client.cfg.InstanceURL)
	jsonBody, err := json.Marshal(sfBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	body, err := r.client.callSFAPI(func(accessToken string) (*http.Request, error) {
		httpReq, err := http.NewRequest("POST", reqURL, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		return httpReq, nil
	})
	if err != nil {
		return nil, fmt.Errorf("claim submission failed: %w", err)
	}

	var resp sfGolfClaimResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	result := &claim.ClaimResult{Success: resp.Success, Error: resp.Error}
	if resp.Data != nil {
		result.NotificationNo = resp.Data.NotificationNo
		result.CaseNumber = resp.Data.CaseNumber
		result.CaseId = resp.Data.CaseId
	}

	log.Printf("[GolfClaim] Result: success=%v, notificationNo=%s, caseId=%s, caseNumber=%s",
		result.Success, result.NotificationNo, result.CaseId, result.CaseNumber)

	return result, nil
}
