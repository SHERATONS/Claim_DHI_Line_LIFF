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

type FRIARClaimRepo struct{ client *Client }

func NewFRIARClaimRepo(c *Client) *FRIARClaimRepo { return &FRIARClaimRepo{client: c} }

type sfFRIARClaimBody struct {
	PolicyId         string `json:"policyId"`
	ContactId        string `json:"contactId"`
	NotifierName     string `json:"notifierName"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	IncidentDateTime string `json:"incidentDateTime"`
	LossPlace        string `json:"lossPlace"`
	FullAddress      string `json:"fullAddress"`
	ProvinceId       string `json:"provinceId"`
	DistrictId       string `json:"districtId"`
	SubdistrictId    string `json:"subdistrictId"`
	Zipcode          string `json:"zipcode"`
	LossReserve      string `json:"lossReserve"`
	CauseOfLoss      string `json:"causeOfLoss"`
}

type sfFRIARClaimResponse struct {
	Success bool              `json:"success"`
	Data    *sfFRIARClaimData `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
}

type sfFRIARClaimData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (r *FRIARClaimRepo) Submit(ctx context.Context, req claim.FRIARClaimRequest) (*claim.ClaimResult, error) {
	// Step 1: Resolve policyNo → policyId.
	policyRepo := NewPolicyRepo(r.client)
	policy, err := policyRepo.LookupPolicy(ctx, req.PolicyNo)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup policy: %w", err)
	}

	log.Printf("[FRIARClaim] Resolved policyNo=%s → policyId=%s", req.PolicyNo, policy.PolicyId)

	// Step 2: Build Salesforce request body.
	sfBody := sfFRIARClaimBody{
		PolicyId:         policy.PolicyId,
		ContactId:        req.ContactId,
		NotifierName:     req.NotifierName,
		Phone:            req.Phone,
		Email:            req.Email,
		IncidentDateTime: req.IncidentDateTime,
		LossPlace:        req.LossPlace,
		FullAddress:      req.FullAddress,
		ProvinceId:       req.ProvinceId,
		DistrictId:       req.DistrictId,
		SubdistrictId:    req.SubdistrictId,
		Zipcode:          req.Zipcode,
		LossReserve:      req.LossReserve,
		CauseOfLoss:      req.CauseOfLoss,
	}

	reqURL := fmt.Sprintf("%s/services/apexrest/liff/claims", r.client.cfg.InstanceURL)
	jsonBody, err := json.Marshal(sfBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	log.Printf("[FRIARClaim] Submitting claim for policyId=%s, notifier=%s", policy.PolicyId, req.NotifierName)

	// Step 3: POST to Salesforce with automatic 401 retry.
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

	var resp sfFRIARClaimResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	result := &claim.ClaimResult{Success: resp.Success, Error: resp.Error}
	if resp.Data != nil {
		result.NotificationNo = resp.Data.NotificationNo
		result.CaseNumber = resp.Data.CaseNumber
		result.CaseId = resp.Data.CaseId
	}

	log.Printf("[FRIARClaim] Result: success=%v, notificationNo=%s, caseId=%s, caseNumber=%s",
		result.Success, result.NotificationNo, result.CaseId, result.CaseNumber)

	return result, nil
}
