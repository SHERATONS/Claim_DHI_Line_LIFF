package claim

import "context"

// MarineCargoClaimRequest is the domain model for Marine_CARGO claim submission.
type MarineCargoClaimRequest struct {
	PolicyNo           string
	ContactId          string
	NotifierName       string
	Phone              string
	Email              string
	IncidentDateTime   string
	LossPlace          string
	VehicleName        string
	VehiclePlate       string
	TransportationType string
	CauseOfLoss        string
	LossReserve        string
}

// MarineCargoClaimRepository handles Marine_CARGO claim submission.
type MarineCargoClaimRepository interface {
	Submit(ctx context.Context, req MarineCargoClaimRequest) (*ClaimResult, error)
}
