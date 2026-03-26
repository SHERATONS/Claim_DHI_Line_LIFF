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

type FRIARClaimHandler struct {
	repo   claim.FRIARClaimRepository
	worker *service.AsyncWorker
	gcs    *gcs.Client
}

func NewFRIARClaimHandler(repo claim.FRIARClaimRepository, worker *service.AsyncWorker, gcsClient *gcs.Client) *FRIARClaimHandler {
	return &FRIARClaimHandler{repo: repo, worker: worker, gcs: gcsClient}
}

type friarClaimForm struct {
	PolicyNo         string `form:"policyNo" binding:"required"`
	ContactId        string `form:"contactId"`
	PolicyHolder     string `form:"policyHolder"`
	NotifierName     string `form:"notifierName" binding:"required"`
	Phone            string `form:"phone" binding:"required"`
	Email            string `form:"email"`
	IncidentDateTime string `form:"incidentDateTime" binding:"required"`
	LossPlace        string `form:"lossPlace"`
	FullAddress      string `form:"fullAddress"`
	ProvinceId       string `form:"provinceId"`
	DistrictId       string `form:"districtId"`
	SubdistrictId    string `form:"subdistrictId"`
	Zipcode          string `form:"zipcode"`
	LossReserve      string `form:"lossReserve"`
	CauseOfLoss      string `form:"causeOfLoss"`
}

type friarClaimResponse struct {
	Success bool             `json:"success"`
	Data    *friarResultData `json:"data,omitempty"`
	Error   string           `json:"error,omitempty"`
}

type friarResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *FRIARClaimHandler) Handle(c *gin.Context) {
	var form friarClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.FRIARClaimRequest{
		PolicyNo:         form.PolicyNo,
		ContactId:        form.ContactId,
		PolicyHolder:     form.PolicyHolder,
		NotifierName:     form.NotifierName,
		Phone:            form.Phone,
		Email:            form.Email,
		IncidentDateTime: form.IncidentDateTime,
		LossPlace:        form.LossPlace,
		FullAddress:      form.FullAddress,
		ProvinceId:       form.ProvinceId,
		DistrictId:       form.DistrictId,
		SubdistrictId:    form.SubdistrictId,
		Zipcode:          form.Zipcode,
		LossReserve:      form.LossReserve,
		CauseOfLoss:      form.CauseOfLoss,
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
				log.Printf("[FRIARClaim] Failed to open file: %v", err)
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
				log.Printf("[FRIARClaim] Failed to stream to GCS: %v", err)
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
		log.Printf("[FRIARClaim] ERROR: %v", err)
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

	c.JSON(http.StatusOK, friarClaimResponse{
		Success: result.Success,
		Data:    &friarResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
