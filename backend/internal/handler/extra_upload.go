package handler

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type ExtraUploadHandler struct {
	upload  domain.UploadRepository
	storage domain.StorageRepository
	gen     domain.ContentGenerator
}

func NewExtraUploadHandler(upload domain.UploadRepository, storage domain.StorageRepository, gen domain.ContentGenerator) *ExtraUploadHandler {
	return &ExtraUploadHandler{upload: upload, storage: storage, gen: gen}
}

func (h *ExtraUploadHandler) Handle(c *gin.Context) {
	notificationNo := c.PostForm("notificationNo")
	if notificationNo == "" {
		httpresponse.BadRequest(c, fmt.Errorf("notificationNo is required"))
		return
	}

	// 1. Lookup Case ID and CaseNumber (with Mock fallback for prototype)
	caseId, caseNumber, err := h.upload.LookupCase(c.Request.Context(), notificationNo)
	if err != nil {
		log.Printf("[ExtraUpload] Lookup failed for %s (using mock data for prototype): %v", notificationNo, err)
		// Mock data fallback
		caseId = "mock-case-id"
		caseNumber = notificationNo // Just use the provided number as folder name
	}

	// 2. Parse Files
	var uploadErrors []string
	var fileInputs []domain.FileInput

	if err := c.Request.ParseMultipartForm(32 << 20); err == nil {
		files := c.Request.MultipartForm.File["files"]
		if len(files) == 0 {
			files = c.Request.MultipartForm.File["file"]
		}

		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				uploadErrors = append(uploadErrors, "failed to open "+fileHeader.Filename+": "+err.Error())
				continue
			}
			fileData, err := io.ReadAll(file)
			file.Close()
			if err != nil {
				uploadErrors = append(uploadErrors, "failed to read "+fileHeader.Filename+": "+err.Error())
				continue
			}

			mimeType := http.DetectContentType(fileData)
			fileInputs = append(fileInputs, domain.FileInput{
				Data:     fileData,
				MimeType: mimeType,
				Filename: fileHeader.Filename,
			})
		}
	}

	if len(fileInputs) == 0 {
		httpresponse.BadRequest(c, fmt.Errorf("no files uploaded"))
		return
	}

	// AI Renaming
	renameMap := make(map[string]string)
	analysis, err := h.gen.AnalyzeClaim(c.Request.Context(), gin.H{"notificationNo": notificationNo}, fileInputs)
	if err != nil {
		log.Printf("[ExtraUpload] AI Analysis for renaming failed: %v", err)
	} else if analysis != nil {
		for _, fn := range analysis.FileNames {
			renameMap[fn.Original] = fn.New
		}
	}

	// 3. Upload to GCS and Salesforce
	for _, f := range fileInputs {
		finalName := f.Filename
		if newName, ok := renameMap[f.Filename]; ok && newName != "" {
			finalName = newName
		}

		// Use CaseNumber for GCS folder for easy identification in backend
		objectName := fmt.Sprintf("claims/%s/%s", caseNumber, finalName)
		if _, err := h.storage.SaveFile(c.Request.Context(), objectName, f.Data, f.MimeType); err != nil {
			uploadErrors = append(uploadErrors, "failed to backup "+finalName+" to GCS: "+err.Error())
		}

		if caseId != "mock-case-id" {
			if _, err := h.upload.UploadBinary(c.Request.Context(), finalName, caseId, f.Data); err != nil {
				uploadErrors = append(uploadErrors, "failed to upload "+finalName+": "+err.Error())
			}
		} else {
			log.Printf("[ExtraUpload] Skipping Salesforce upload for mock caseId: %s", finalName)
		}
	}

	if len(uploadErrors) > 0 {
		c.JSON(http.StatusPartialContent, gin.H{
			"success": true,
			"error":   "Some files failed to upload: " + strings.Join(uploadErrors, "; "),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
