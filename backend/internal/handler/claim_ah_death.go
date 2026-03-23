package handler

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/internal/domain/claim"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type AHDeathClaimHandler struct {
	repo   claim.AHDeathClaimRepository
	upload domain.UploadRepository
}

func NewAHDeathClaimHandler(repo claim.AHDeathClaimRepository, upload domain.UploadRepository) *AHDeathClaimHandler {
	return &AHDeathClaimHandler{repo: repo, upload: upload}
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
	CauseOfIllness    string `form:"causeOfIllness"`
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
		CauseOfIllness:    form.CauseOfIllness,
		LossPlace:         form.LossPlace,
		LossReserve:       form.LossReserve,
	}

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[AHDeathClaim] ERROR: %v", err)
		httpresponse.InternalError(c, err)
		return
	}

	// Upload files if claim succeeded and we have a case ID.
	if result.Success && result.CaseId != "" {
		if err := c.Request.ParseMultipartForm(32 << 20); err == nil {
			if files := c.Request.MultipartForm.File["files"]; len(files) > 0 {
				var uploadErrors []string
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
					if _, err = h.upload.UploadBinary(c.Request.Context(), fileHeader.Filename, result.CaseId, fileData); err != nil {
						uploadErrors = append(uploadErrors, "failed to upload "+fileHeader.Filename+": "+err.Error())
					}
				}
				if len(uploadErrors) > 0 {
					result.Error = "Claim submitted, but some files failed to upload: " + strings.Join(uploadErrors, "; ")
					log.Printf("[AHDeathClaim] Partial success: %s", result.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, ahDeathClaimResponse{
		Success: result.Success,
		Data:    &ahDeathResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
