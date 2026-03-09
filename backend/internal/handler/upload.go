package handler

import (
	"errors"
	"io"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	repo domain.UploadRepository
}

func NewUploadHandler(repo domain.UploadRepository) *UploadHandler {
	return &UploadHandler{repo: repo}
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

	fileData, err := io.ReadAll(c.Request.Body)
	if err != nil {
		httpresponse.BadRequest(c, errors.New("failed to read request body"))
		return
	}
	defer c.Request.Body.Close()

	if len(fileData) == 0 {
		httpresponse.BadRequest(c, errors.New("empty file data"))
		return
	}

	result, err := h.repo.UploadBinary(c.Request.Context(), fileName, caseId, fileData)
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
