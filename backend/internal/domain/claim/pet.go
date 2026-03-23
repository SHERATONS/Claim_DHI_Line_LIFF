package claim

import "context"

// PetClaimRequest is the domain model for Pet claim submission.
type PetClaimRequest struct {
	PolicyNo        string
	ContactId       string
	NotifierName    string
	Phone           string
	Email           string
	IncidentDateTime string
	LossPlace       string
	PetName         string
	PetType         string
	PetTypeOther    string
	PetSpecies      string
	PetGender       string
	MicrochipNumber string
	PetHospital     string
	CauseOfLoss     string
	LossReserve     string
}

// PetClaimRepository handles Pet claim submission.
type PetClaimRepository interface {
	Submit(ctx context.Context, req PetClaimRequest) (*ClaimResult, error)
}
