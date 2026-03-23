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

type PetClaimRepo struct{ client *Client }

func NewPetClaimRepo(c *Client) *PetClaimRepo { return &PetClaimRepo{client: c} }

type sfPetClaimBody struct {
	PolicyId         string `json:"policyId"`
	ContactId        string `json:"contactId"`
	NotifierName     string `json:"notifierName"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	IncidentDateTime string `json:"incidentDateTime"`
	LossPlace        string `json:"lossPlace"`
	PetType          string `json:"petType"`
	PetName          string `json:"petName"`
	PetSpecies       string `json:"petSpecies"`
	PetGender        string `json:"petGender"`
	MicrochipNumber  string `json:"microchipNumber"`
	CauseOfLoss      string `json:"causeOfLoss"`
	LossReserve      string `json:"lossReserve"`
}

type sfPetClaimResponse struct {
	Success bool              `json:"success"`
	Data    *sfPetClaimData `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type sfPetClaimData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (r *PetClaimRepo) Submit(ctx context.Context, req claim.PetClaimRequest) (*claim.ClaimResult, error) {
	policyRepo := NewPolicyRepo(r.client)
	policy, err := policyRepo.LookupPolicy(ctx, req.PolicyNo)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup policy: %w", err)
	}

	sfBody := sfPetClaimBody{
		PolicyId:         policy.PolicyId,
		ContactId:        req.ContactId,
		NotifierName:     req.NotifierName,
		Phone:            req.Phone,
		Email:            req.Email,
		IncidentDateTime: req.IncidentDateTime,
		LossPlace:        req.LossPlace,
		PetType:          req.PetType, // Combine Type/Other if needed, but Apex expects petType
		PetName:          req.PetName,
		PetSpecies:       req.PetSpecies,
		PetGender:        req.PetGender,
		MicrochipNumber:  req.MicrochipNumber,
		CauseOfLoss:      req.CauseOfLoss,
		LossReserve:      req.LossReserve,
	}

	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims/pet", r.client.cfg.InstanceURL)
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

	var resp sfPetClaimResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	result := &claim.ClaimResult{Success: resp.Success, Error: resp.Error}
	if resp.Data != nil {
		result.NotificationNo = resp.Data.NotificationNo
		result.CaseNumber = resp.Data.CaseNumber
		result.CaseId = resp.Data.CaseId
	}

	log.Printf("[PetClaim] Result: success=%v, notificationNo=%s, caseId=%s, caseNumber=%s",
		result.Success, result.NotificationNo, result.CaseId, result.CaseNumber)

	return result, nil
}
