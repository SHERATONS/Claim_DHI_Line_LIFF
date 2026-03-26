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

type CAREARCPMClaimHandler struct {
	repo   claim.CAREARCPMClaimRepository
	worker *service.AsyncWorker
	gcs    *gcs.Client
}

func NewCAREARCPMClaimHandler(repo claim.CAREARCPMClaimRepository, worker *service.AsyncWorker, gcsClient *gcs.Client) *CAREARCPMClaimHandler {
	return &CAREARCPMClaimHandler{repo: repo, worker: worker, gcs: gcsClient}
}

type carEarCpmClaimForm struct {
	PolicyNo         string `form:"policyNo" binding:"required"`
	ContactId        string `form:"contactId"`
	NotifierName     string `form:"notifierName" binding:"required"`
	Phone            string `form:"phone" binding:"required"`
	Email            string `form:"email"`
	IncidentDateTime string `form:"incidentDateTime" binding:"required"`
	LossPlace        string `form:"lossPlace"`
	ProvinceId       string `form:"provinceId"`
	DistrictId       string `form:"districtId"`
	SubdistrictId    string `form:"subdistrictId"`
	ProjectTitle     string `form:"projectTitle"`
	ContractorName   string `form:"contractorName"`
	CauseOfLoss      string `form:"causeOfLoss"`
	LossReserve      string `form:"lossReserve"`
}

type carEarCpmClaimResponse struct {
	Success bool                 `json:"success"`
	Data    *carEarCpmResultData `json:"data,omitempty"`
	Error   string               `json:"error,omitempty"`
}

type carEarCpmResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *CAREARCPMClaimHandler) Handle(c *gin.Context) {
	var form carEarCpmClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.CAREARCPMClaimRequest{
		PolicyNo:         form.PolicyNo,
		ContactId:        form.ContactId,
		NotifierName:     form.NotifierName,
		Phone:            form.Phone,
		Email:            form.Email,
		IncidentDateTime: form.IncidentDateTime,
		LossPlace:        form.LossPlace,
		ProvinceId:       form.ProvinceId,
		DistrictId:       form.DistrictId,
		SubdistrictId:    form.SubdistrictId,
		ProjectTitle:     form.ProjectTitle,
		ContractorName:   form.ContractorName,
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
				log.Printf("[CAREARCPMClaim] Failed to open file: %v", err)
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
				log.Printf("[CAREARCPMClaim] Failed to stream to GCS: %v", err)
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
		log.Printf("[CAREARCPMClaim] ERROR: %v", err)
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
			Files:          fileInputs,
		}

		go func() {
			h.worker.ProcessClaim(context.Background(), bgCtx)
		}()
	}

	c.JSON(http.StatusOK, carEarCpmClaimResponse{
		Success: result.Success,
		Data:    &carEarCpmResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
