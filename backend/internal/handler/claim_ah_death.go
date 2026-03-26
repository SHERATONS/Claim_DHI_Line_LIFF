package handler

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/internal/domain/claim"
	"github.com/SHERATONS/backend/internal/infra/gcs"
	"github.com/SHERATONS/backend/internal/service"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type AHDeathClaimHandler struct {
	repo   claim.AHDeathClaimRepository
	worker *service.AsyncWorker
	gcs    *gcs.Client // New: Direct GCS access for streaming
}

func NewAHDeathClaimHandler(repo claim.AHDeathClaimRepository, worker *service.AsyncWorker, gcsClient *gcs.Client) *AHDeathClaimHandler {
	return &AHDeathClaimHandler{repo: repo, worker: worker, gcs: gcsClient}
}

type ahDeathClaimForm struct {
	PolicyNo          string `form:"policyNo" binding:"required"`
	ContactId         string `form:"contactId"`
	NotifierName      string `form:"notifierName" binding:"required"`
	Phone             string `form:"phone" binding:"required"`
	Email             string `form:"email"`
	AccidentDate      string `form:"accidentDate" binding:"required"`
	TreatmentDate     string `form:"treatmentDate"`
	TreatmentHospital string `form:"treatmentHospital"`
	CauseOfLoss       string `form:"causeOfLoss"`
	LossPlace         string `form:"lossPlace"`
	LossReserve       string `form:"lossReserve"`
}

type ahDeathClaimResponse struct {
	Success bool               `json:"success"`
	Data    *ahDeathResultData `json:"data,omitempty"`
	Error   string             `json:"error,omitempty"`
}

type ahDeathResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *AHDeathClaimHandler) Handle(c *gin.Context) {
	var form ahDeathClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.AHDeathClaimRequest{
		PolicyNo:          form.PolicyNo,
		ContactId:         form.ContactId,
		NotifierName:      form.NotifierName,
		Phone:             form.Phone,
		Email:             form.Email,
		AccidentDate:      form.AccidentDate,
		TreatmentDate:     form.TreatmentDate,
		TreatmentHospital: form.TreatmentHospital,
		CauseOfLoss:       form.CauseOfLoss,
		LossPlace:         form.LossPlace,
		LossReserve:       form.LossReserve,
	}

	var fileInputs []domain.FileInput
	timestamp := time.Now().Format("20060102_150405")
	folderName := fmt.Sprintf("%s_%s", req.PolicyNo, timestamp)

	if err := c.Request.ParseMultipartForm(32 << 20); err == nil {
		files := c.Request.MultipartForm.File["files"]
		if len(files) == 0 {
			files = c.Request.MultipartForm.File["file"]
		}

		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				log.Printf("[AHDeathClaim] Failed to open file: %v", err)
				continue
			}
			defer file.Close()

			mimeType := fileHeader.Header.Get("Content-Type")
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			objectName := fmt.Sprintf("%s/%s", folderName, fileHeader.Filename)
			gcsURI, err := h.gcs.StreamFile(c.Request.Context(), objectName, file, mimeType)
			if err != nil {
				log.Printf("[AHDeathClaim] Failed to stream to GCS: %v", err)
				continue
			}

			fileInputs = append(fileInputs, domain.FileInput{
				MimeType: mimeType,
				Filename: fileHeader.Filename,
				GCSURI:   gcsURI,
			})
		}
	}

	// Submit text to Salesforce synchronously
	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[AHDeathClaim] ERROR: %v", err)
		httpresponse.InternalError(c, err)
		return
	}

	// Trigger background tasks if submission succeeded
	if result.Success && result.CaseId != "" {
		bgCtx := service.BackgroundContext{
			NotificationNo: result.NotificationNo,
			CaseId:         result.CaseId,
			PolicyNo:       req.PolicyNo,
			ContactId:      req.ContactId,
			PolicyHolder:   form.NotifierName, // Or policyHolder if available
			Files:          fileInputs,
		}

		// Run in background Go routine
		go func() {
			// Use background context for the worker
			h.worker.ProcessClaim(context.Background(), bgCtx)
		}()
	}

	c.JSON(http.StatusOK, ahDeathClaimResponse{
		Success: result.Success,
		Data:    &ahDeathResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
