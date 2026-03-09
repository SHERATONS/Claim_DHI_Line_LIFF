package domain

import "context"

type Policy struct {
	PolicyNumber    string `json:"policyNumber"`
	PolicyId        string `json:"policyId"`
	IsPersonAccount bool   `json:"isPersonAccount"`
	AccountName     string `json:"accountName"`
	AccountId       string `json:"accountId"`
}

type PolicyRepository interface {
	LookupPolicy(ctx context.Context, policyNo string) (*Policy, error)
}
