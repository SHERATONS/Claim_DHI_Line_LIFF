package claim

import "context"

// MarineHullClaimRequest is the domain model for Marine_HULL claim submission.
type MarineHullClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	LossPlace        string
	BoatName         string
	CauseOfLoss      string
	LossReserve      string
}

// MarineHullClaimRepository handles Marine_HULL claim submission.
type MarineHullClaimRepository interface {
	Submit(ctx context.Context, req MarineHullClaimRequest) (*ClaimResult, error)
}
