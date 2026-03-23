package claim

import "context"

// OtherClaimRequest is the domain model for Other claim submission.
type OtherClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	LossPlace        string
	CauseOfLoss      string
	LossReserve      string
}

// OtherClaimRepository handles Other claim submission.
type OtherClaimRepository interface {
	Submit(ctx context.Context, req OtherClaimRequest) (*ClaimResult, error)
}
