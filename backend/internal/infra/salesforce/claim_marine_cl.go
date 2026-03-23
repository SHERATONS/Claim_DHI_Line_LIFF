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

type MarineCLClaimRepo struct{ client *Client }

func NewMarineCLClaimRepo(c *Client) *MarineCLClaimRepo { return &MarineCLClaimRepo{client: c} }

type sfMarineCLClaimBody struct {
	PolicyId           string `json:"policyId"`
	ContactId          string `json:"contactId"`
	NotifierName       string `json:"notifierName"`
	Phone              string `json:"phone"`
	Email              string `json:"email"`
	IncidentDateTime   string `json:"incidentDateTime"`
	LossPlace          string `json:"lossPlace"`
	VehicleName        string `json:"vehicleName"`
	VehiclePlate       string `json:"vehiclePlate"`
	TransportationType string `json:"transportationType"`
	CauseOfLoss        string `json:"causeOfLoss"`
	LossReserve        string `json:"lossReserve"`
}

type sfMarineCLClaimResponse struct {
	Success bool                   `json:"success"`
	Data    *sfMarineCLClaimData `json:"data,omitempty"`
	Error   string               `json:"error,omitempty"`
}

type sfMarineCLClaimData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (r *MarineCLClaimRepo) Submit(ctx context.Context, req claim.MarineCLClaimRequest) (*claim.ClaimResult, error) {
	policyRepo := NewPolicyRepo(r.client)
	policy, err := policyRepo.LookupPolicy(ctx, req.PolicyNo)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup policy: %w", err)
	}

	sfBody := sfMarineCLClaimBody{
		PolicyId:           policy.PolicyId,
		ContactId:          req.ContactId,
		NotifierName:       req.NotifierName,
		Phone:              req.Phone,
		Email:              req.Email,
		IncidentDateTime:   req.IncidentDateTime,
		LossPlace:          req.LossPlace,
		VehicleName:        req.VehicleName,
		VehiclePlate:       req.VehiclePlate,
		TransportationType: req.TransportationType,
		CauseOfLoss:        req.CauseOfLoss,
		LossReserve:        req.LossReserve,
	}

	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims/marinecl", r.client.cfg.InstanceURL)
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

	var resp sfMarineCLClaimResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	result := &claim.ClaimResult{Success: resp.Success, Error: resp.Error}
	if resp.Data != nil {
		result.NotificationNo = resp.Data.NotificationNo
		result.CaseNumber = resp.Data.CaseNumber
		result.CaseId = resp.Data.CaseId
	}

	log.Printf("[MarineCLClaim] Result: success=%v, notificationNo=%s, caseId=%s, caseNumber=%s",
		result.Success, result.NotificationNo, result.CaseId, result.CaseNumber)

	return result, nil
}
