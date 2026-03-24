package handler

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	repo    domain.UploadRepository
	storage domain.StorageRepository
}

func NewUploadHandler(repo domain.UploadRepository, storage domain.StorageRepository) *UploadHandler {
	return &UploadHandler{repo: repo, storage: storage}
}

func (h *UploadHandler) UploadBinary(c *gin.Context) {
	fileName := c.Query("fileName")
	caseId := c.Query("caseId")

	if fileName == "" {
		httpresponse.BadRequest(c, errors.New("fileName query parameter is required"))
		return
	}
	if caseId == "" {
		httpresponse.BadRequest(c, errors.New("caseId query parameter is required"))
		return
	}

	defer c.Request.Body.Close()

	mimeType := c.GetHeader("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream" // Default fallback for raw binary
	}
	objectName := fmt.Sprintf("claims/%s/%s", caseId, fileName)

	// 1. Stream the incoming connection straight to GCS (Zero-RAM buffer bypass)
	if _, err := h.storage.StreamFile(c.Request.Context(), objectName, c.Request.Body, mimeType); err != nil {
		httpresponse.InternalError(c, fmt.Errorf("failed to stream file directly to GCS: %w", err))
		return
	}

	// 2. Safely read it back into memory from GCS to send to Salesforce.
	// This ensures the master copy is safely persisted and network transfers
	// succeed before any heavy RAM is allocated!
	sfFileData, err := h.storage.ReadFile(c.Request.Context(), objectName)
	if err != nil {
		httpresponse.InternalError(c, fmt.Errorf("failed to read from GCS backup: %w", err))
		return
	}

	// 3. Upload to Salesforce using the safe memory buffer
	result, err := h.repo.UploadBinary(c.Request.Context(), fileName, caseId, sfFileData)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	// Upload response is flat (no nested "data") to match the original wire format.
	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"contentDocumentId": result.ContentDocumentId,
		"contentVersionId":  result.ContentVersionId,
	})
}
