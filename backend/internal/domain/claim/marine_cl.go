package claim

import "context"

// MarineCLClaimRequest is the domain model for Marine_CL claim submission.
type MarineCLClaimRequest struct {
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

// MarineCLClaimRepository handles Marine_CL claim submission.
type MarineCLClaimRepository interface {
	Submit(ctx context.Context, req MarineCLClaimRequest) (*ClaimResult, error)
}
