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

type TAClaimHandler struct {
	repo   claim.TAClaimRepository
	upload domain.UploadRepository
}

func NewTAClaimHandler(repo claim.TAClaimRepository, upload domain.UploadRepository) *TAClaimHandler {
	return &TAClaimHandler{repo: repo, upload: upload}
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

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[TAClaim] ERROR: %v", err)
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
					log.Printf("[TAClaim] Partial success: %s", result.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, taClaimResponse{
		Success: result.Success,
		Data:    &taResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
