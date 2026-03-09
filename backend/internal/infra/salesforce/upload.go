package salesforce

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/SHERATONS/backend/internal/domain"
)

type UploadRepo struct{ client *Client }

func NewUploadRepo(c *Client) *UploadRepo { return &UploadRepo{client: c} }

type sfUploadResponse struct {
	Success           bool   `json:"success"`
	ContentDocumentId string `json:"contentDocumentId"`
	ContentVersionId  string `json:"contentVersionId"`
	Error             string `json:"error,omitempty"`
}

func (r *UploadRepo) UploadBinary(_ context.Context, fileName, caseId string, data []byte) (*domain.UploadResult, error) {
	reqURL := fmt.Sprintf("%s/services/apexrest/liff/upload-binary?fileName=%s&caseId=%s",
		r.client.cfg.InstanceURL,
		url.QueryEscape(fileName),
		url.QueryEscape(caseId),
	)

	log.Printf("[Upload] Sending file '%s' (%d bytes) for caseId=%s", fileName, len(data), caseId)

	body, err := r.client.callSFAPI(func(accessToken string) (*http.Request, error) {
		req, err := http.NewRequest("POST", reqURL, bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/octet-stream")
		return req, nil
	})
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	var resp sfUploadResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	log.Printf("[Upload] Result: success=%v, contentDocumentId=%s", resp.Success, resp.ContentDocumentId)

	return &domain.UploadResult{
		ContentDocumentId: resp.ContentDocumentId,
		ContentVersionId:  resp.ContentVersionId,
	}, nil
}
