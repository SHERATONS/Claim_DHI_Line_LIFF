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

type DroneClaimHandler struct {
	repo   claim.DroneClaimRepository
	upload domain.UploadRepository
}

func NewDroneClaimHandler(repo claim.DroneClaimRepository, upload domain.UploadRepository) *DroneClaimHandler {
	return &DroneClaimHandler{repo: repo, upload: upload}
}

type droneClaimForm struct {
	PolicyNo         string `form:"policyNo" binding:"required"`
	ContactId        string `form:"contactId"`
	NotifierName     string `form:"notifierName" binding:"required"`
	Phone            string `form:"phone" binding:"required"`
	Email            string `form:"email"`
	IncidentDateTime string `form:"incidentDateTime" binding:"required"`
	LossPlace        string `form:"lossPlace"`
	DriverName       string `form:"driverName"`
	DroneModel       string `form:"droneModel"`
	CauseOfLoss      string `form:"causeOfLoss"`
	LossReserve      string `form:"lossReserve"`
}

type droneClaimResponse struct {
	Success bool             `json:"success"`
	Data    *droneResultData `json:"data,omitempty"`
	Error   string           `json:"error,omitempty"`
}

type droneResultData struct {
	NotificationNo string `json:"notificationNo"`
	CaseNumber     string `json:"caseNumber"`
	CaseId         string `json:"caseId"`
}

func (h *DroneClaimHandler) Handle(c *gin.Context) {
	var form droneClaimForm
	if err := c.ShouldBind(&form); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	req := claim.DroneClaimRequest{
		PolicyNo:         form.PolicyNo,
		ContactId:        form.ContactId,
		NotifierName:     form.NotifierName,
		Phone:            form.Phone,
		Email:             form.Email,
		IncidentDateTime: form.IncidentDateTime,
		LossPlace:        form.LossPlace,
		DriverName:       form.DriverName,
		DroneModel:       form.DroneModel,
		CauseOfLoss:      form.CauseOfLoss,
		LossReserve:      form.LossReserve,
	}

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[DroneClaim] ERROR: %v", err)
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
					log.Printf("[DroneClaim] Partial success: %s", result.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, droneClaimResponse{
		Success: result.Success,
		Data:    &droneResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
