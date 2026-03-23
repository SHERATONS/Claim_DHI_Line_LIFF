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

type AHDeathClaimRepo struct{ client *Client }

func NewAHDeathClaimRepo(c *Client) *AHDeathClaimRepo { return &AHDeathClaimRepo{client: c} }

type sfAHDeathClaimBody struct {
	PolicyId          string `json:"policyId"`
	ContactId         string `json:"contactId"`
	NotifierName      string `json:"notifierName"`
	Phone             string `json:"phone"`
	Email             string `json:"email"`
	IncidentDateTime  string `json:"incidentDateTime"`
	TreatmentDate     string `json:"treatmentDate"`
	TreatmentHospital string `json:"treatmentHospital"`
	CauseOfDeath      string `json:"causeOfDeath"`
	LossPlace         string `json:"lossPlace"`
	LossReserve       string `json:"lossReserve"`
}

type sfAHDeathClaimResponse struct {
	Success bool                `json:"success"`
	Data    *sfAHDeathClaimData `json:"data,omitempty"`
	Error   string              `json:"error,omitempty"`
}

type sfAHDeathClaimData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (r *AHDeathClaimRepo) Submit(ctx context.Context, req claim.AHDeathClaimRequest) (*claim.ClaimResult, error) {
	policyRepo := NewPolicyRepo(r.client)
	policy, err := policyRepo.LookupPolicy(ctx, req.PolicyNo)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup policy: %w", err)
	}

	sfBody := sfAHDeathClaimBody{
		PolicyId:          policy.PolicyId,
		ContactId:         req.ContactId,
		NotifierName:      req.NotifierName,
		Phone:             req.Phone,
		Email:             req.Email,
		IncidentDateTime:  req.AccidentDate, // Apex treats incidentDateTime or accidentDate
		TreatmentDate:     req.TreatmentDate,
		TreatmentHospital: req.TreatmentHospital,
		CauseOfDeath:      req.CauseOfIllness, // Maps frontend causeOfIllness to Apex causeOfDeath
		LossPlace:         req.LossPlace,
		LossReserve:       req.LossReserve,
	}

	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims/ahdeath", r.client.cfg.InstanceURL)
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

	var resp sfAHDeathClaimResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	result := &claim.ClaimResult{Success: resp.Success, Error: resp.Error}
	if resp.Data != nil {
		result.NotificationNo = resp.Data.NotificationNo
		result.CaseNumber = resp.Data.CaseNumber
		result.CaseId = resp.Data.CaseId
	}

	log.Printf("[AHDeathClaim] Result: success=%v, notificationNo=%s, caseId=%s, caseNumber=%s",
		result.Success, result.NotificationNo, result.CaseId, result.CaseNumber)

	return result, nil
}
