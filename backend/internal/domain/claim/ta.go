package claim

import "context"

// TAClaimRequest is the domain model for TA claim submission.
type TAClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	AccidentPlace    string
	FlightNumber     string
	CauseOfLoss      string
	LossReserve      string
}

// TAClaimRepository handles TA claim submission.
type TAClaimRepository interface {
	Submit(ctx context.Context, req TAClaimRequest) (*ClaimResult, error)
}
