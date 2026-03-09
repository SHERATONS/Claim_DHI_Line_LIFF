package claim

import "context"

// FRIARClaimRequest is the domain model for FR_IAR claim submission.
type FRIARClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	LossPlace        string
	FullAddress      string
	ProvinceId       string
	DistrictId       string
	SubdistrictId    string
	Zipcode          string
	LossReserve      string
	CauseOfLoss      string
}

// FRIARClaimRepository handles FR_IAR claim submission.
type FRIARClaimRepository interface {
	Submit(ctx context.Context, req FRIARClaimRequest) (*ClaimResult, error)
}
