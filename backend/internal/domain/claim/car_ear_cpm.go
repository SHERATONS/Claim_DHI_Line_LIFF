package claim

import "context"

// CAREARCPMClaimRequest is the domain model for CAR_EAR_CPM claim submission.
type CAREARCPMClaimRequest struct {
	PolicyNo         string
	ContactId        string
	NotifierName     string
	Phone            string
	Email            string
	IncidentDateTime string
	ProjectTitle     string
	ContractorName   string
	LossPlace        string
	ProvinceId       string
	DistrictId       string
	SubdistrictId    string
	Zipcode          string
	CauseOfLoss      string
	LossReserve      string
}

// CAREARCPMClaimRepository handles CAR_EAR_CPM claim submission.
type CAREARCPMClaimRepository interface {
	Submit(ctx context.Context, req CAREARCPMClaimRequest) (*ClaimResult, error)
}
