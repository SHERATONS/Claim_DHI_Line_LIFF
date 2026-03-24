package domain

import (
	"context"
)

type FileInput struct {
	Data     []byte
	MimeType string
	Filename string
}

type FileRename struct {
	Original string `json:"original"`
	New      string `json:"new"`
}

type VerificationData struct {
	PolicyNo     string `json:"policyNo"`
	ContactId    string `json:"contactId"`
	PolicyHolder string `json:"policyHolder"`
}

type ClaimAnalysisResult struct {
	FileNames    []FileRename     `json:"fileNames"`
	Verification VerificationData `json:"verification"`
	Summary      string           `json:"summary"`
}

type ContentGenerator interface {
	GenerateContent(ctx context.Context, files []FileInput) (string, error)
	AnalyzeClaim(ctx context.Context, form any, files []FileInput) (*ClaimAnalysisResult, error)
}
