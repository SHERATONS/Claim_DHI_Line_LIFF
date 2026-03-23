package claim

import "context"

// DroneClaimRequest is the domain model for Drone claim submission.
type DroneClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	LossPlace        string
	DriverName       string
	DroneModel       string
	CauseOfLoss      string
	LossReserve      string
}

// DroneClaimRepository handles Drone claim submission.
type DroneClaimRepository interface {
	Submit(ctx context.Context, req DroneClaimRequest) (*ClaimResult, error)
}
