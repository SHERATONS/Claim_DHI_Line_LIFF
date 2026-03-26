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

type TAClaimHandler struct {
	repo   claim.TAClaimRepository
	worker *service.AsyncWorker
	gcs    *gcs.Client
}

func NewTAClaimHandler(repo claim.TAClaimRepository, worker *service.AsyncWorker, gcsClient *gcs.Client) *TAClaimHandler {
	return &TAClaimHandler{repo: repo, worker: worker, gcs: gcsClient}
}

type taClaimForm struct {
	PolicyNo         string `form:"policyNo" binding:"required"`
	ContactId        string `form:"contactId"`
	NotifierName     string `form:"notifierName" binding:"required"`
	Phone            string `form:"phone" binding:"required"`
	Email            string `form:"email"`
	IncidentDateTime string `form:"incidentDateTime" binding:"required"`
	AccidentPlace    string `form:"accidentPlace"`
	FlightNumber     string `form:"flightNumber"`
	CauseOfLoss      string `form:"causeOfLoss"`
	LossReserve      string `form:"lossReserve"`
}

type taClaimResponse struct {
	Success bool          `json:"success"`
	Data    *taResultData `json:"data,omitempty"`
	Error   string        `json:"error,omitempty"`
}

type taResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *TAClaimHandler) Handle(c *gin.Context) {
	var form taClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.TAClaimRequest{
		PolicyNo:         form.PolicyNo,
		ContactId:        form.ContactId,
		NotifierName:     form.NotifierName,
		Phone:            form.Phone,
		Email:            form.Email,
		IncidentDateTime: form.IncidentDateTime,
		AccidentPlace:    form.AccidentPlace,
		FlightNumber:     form.FlightNumber,
		CauseOfLoss:      form.CauseOfLoss,
		LossReserve:      form.LossReserve,
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
				log.Printf("[TAClaim] Failed to open file: %v", err)
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
				log.Printf("[TAClaim] Failed to stream to GCS: %v", err)
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
		log.Printf("[TAClaim] ERROR: %v", err)
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
			PolicyHolder:   form.NotifierName,
			FlightNumber:   req.FlightNumber, // Critical for TA Search
			Files:          fileInputs,
		}

		go func() {
			h.worker.ProcessClaim(context.Background(), bgCtx)
		}()
	}

	c.JSON(http.StatusOK, taClaimResponse{
		Success: result.Success,
		Data:    &taResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
