package domain

import "context"

type UploadResult struct {
	ContentDocumentId string `json:"contentDocumentId"`
	ContentVersionId  string `json:"contentVersionId"`
}

type UploadRepository interface {
	UploadBinary(ctx context.Context, fileName, caseId string, data []byte) (*UploadResult, error)
}
