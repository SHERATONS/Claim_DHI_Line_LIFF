package claim

import "context"

// GolfClaimRequest is the domain model for Golf claim submission.
type GolfClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	LossPlace        string
	GolferName       string
	CauseOfLoss      string
	LossReserve      string
}

// GolfClaimRepository handles Golf claim submission.
type GolfClaimRepository interface {
	Submit(ctx context.Context, req GolfClaimRequest) (*ClaimResult, error)
}
