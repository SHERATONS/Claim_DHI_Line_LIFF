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

type MarineCLClaimHandler struct {
	repo   claim.MarineCLClaimRepository
	upload domain.UploadRepository
}

func NewMarineCLClaimHandler(repo claim.MarineCLClaimRepository, upload domain.UploadRepository) *MarineCLClaimHandler {
	return &MarineCLClaimHandler{repo: repo, upload: upload}
}

type marineCLClaimForm struct {
	PolicyNo           string `form:"policyNo" binding:"required"`
	ContactId          string `form:"contactId"`
	NotifierName       string `form:"notifierName" binding:"required"`
	Phone              string `form:"phone" binding:"required"`
	Email              string `form:"email"`
	IncidentDateTime   string `form:"incidentDateTime" binding:"required"`
	LossPlace          string `form:"lossPlace"`
	VehicleName        string `form:"vehicleName"`
	VehiclePlate       string `form:"vehiclePlate"`
	TransportationType string `form:"transportationType"`
	CauseOfLoss        string `form:"causeOfLoss"`
	LossReserve        string `form:"lossReserve"`
}

type marineCLClaimResponse struct {
	Success bool                `json:"success"`
	Data    *marineCLResultData `json:"data,omitempty"`
	Error   string              `json:"error,omitempty"`
}

type marineCLResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *MarineCLClaimHandler) Handle(c *gin.Context) {
	var form marineCLClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.MarineCLClaimRequest{
		PolicyNo:           form.PolicyNo,
		ContactId:          form.ContactId,
		NotifierName:       form.NotifierName,
		Phone:              form.Phone,
		Email:              form.Email,
		IncidentDateTime:   form.IncidentDateTime,
		LossPlace:          form.LossPlace,
		VehicleName:        form.VehicleName,
		VehiclePlate:       form.VehiclePlate,
		TransportationType: form.TransportationType,
		CauseOfLoss:        form.CauseOfLoss,
		LossReserve:        form.LossReserve,
	}

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[MarineCLClaim] ERROR: %v", err)
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
					log.Printf("[MarineCLClaim] Partial success: %s", result.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, marineCLClaimResponse{
		Success: result.Success,
		Data:    &marineCLResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
