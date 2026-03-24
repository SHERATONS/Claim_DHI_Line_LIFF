package claim

import "context"

// AHDeathClaimRequest is the domain model for AH_Death claim submission.
type AHDeathClaimRequest struct {
	PolicyNo          string
	ContactId         string
	NotifierName      string
	Phone             string
	Email             string
	LossPlace         string
	AccidentDate      string
	TreatmentDate     string
	TreatmentHospital string
	CauseOfLoss       string
	LossReserve       string
}

// AHDeathClaimRepository handles AH_Death claim submission.
type AHDeathClaimRepository interface {
	Submit(ctx context.Context, req AHDeathClaimRequest) (*ClaimResult, error)
}
