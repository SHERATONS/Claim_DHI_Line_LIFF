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

type CAREARCPMClaimHandler struct {
	repo   claim.CAREARCPMClaimRepository
	upload domain.UploadRepository
}

func NewCAREARCPMClaimHandler(repo claim.CAREARCPMClaimRepository, upload domain.UploadRepository) *CAREARCPMClaimHandler {
	return &CAREARCPMClaimHandler{repo: repo, upload: upload}
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

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[CAREARCPMClaim] ERROR: %v", err)
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
					log.Printf("[CAREARCPMClaim] Partial success: %s", result.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, carEarCpmClaimResponse{
		Success: result.Success,
		Data:    &carEarCpmResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
