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
	repo    claim.CAREARCPMClaimRepository
	upload  domain.UploadRepository
	storage domain.StorageRepository
	gen     domain.ContentGenerator
}

func NewCAREARCPMClaimHandler(repo claim.CAREARCPMClaimRepository, upload domain.UploadRepository, storage domain.StorageRepository, gen domain.ContentGenerator) *CAREARCPMClaimHandler {
	return &CAREARCPMClaimHandler{repo: repo, upload: upload, storage: storage, gen: gen}
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

	var uploadErrors []string
	var fileInputs []domain.FileInput

	if err := c.Request.ParseMultipartForm(32 << 20); err == nil {
		files := c.Request.MultipartForm.File["files"]
		if len(files) == 0 {
			files = c.Request.MultipartForm.File["file"]
		}

		if len(files) > 0 {
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
	}

	renameMap := make(map[string]string)
	if len(fileInputs) > 0 {
		analysis, err := h.gen.AnalyzeClaim(c.Request.Context(), req, fileInputs)
		if err != nil {
			log.Printf("[CAREARCPMClaim] AI Analysis failed: %v", err)
		} else if analysis != nil {
			verificationStr := fmt.Sprintf("PolicyNo %s, ContactId %s, PolicyHolder %s",
				analysis.Verification.PolicyNo,
				analysis.Verification.ContactId,
				analysis.Verification.PolicyHolder)

			var newCauseOfLoss string
			if req.CauseOfLoss != "" {
				newCauseOfLoss = fmt.Sprintf("original:\n%s\nverification:\n%s\nsummary:\n%s", req.CauseOfLoss, verificationStr, analysis.Summary)
			} else {
				newCauseOfLoss = fmt.Sprintf("verification:\n%s\nsummary:\n%s", verificationStr, analysis.Summary)
			}
			req.CauseOfLoss = newCauseOfLoss

			for _, fn := range analysis.FileNames {
				renameMap[fn.Original] = fn.New
			}
		}
	}

	result, err := h.repo.Submit(c.Request.Context(), req)
	if err != nil {
		log.Printf("[CAREARCPMClaim] ERROR: %v", err)
		httpresponse.InternalError(c, err)
		return
	}

	if result.Success && result.CaseId != "" && len(fileInputs) > 0 {
		for _, f := range fileInputs {
			finalName := f.Filename
			if newName, ok := renameMap[f.Filename]; ok && newName != "" {
				finalName = newName
			}

			objectName := fmt.Sprintf("claims/%s/%s", result.CaseId, finalName)
			if _, err := h.storage.SaveFile(c.Request.Context(), objectName, f.Data, f.MimeType); err != nil {
				uploadErrors = append(uploadErrors, "failed to backup "+finalName+" to GCS: "+err.Error())
			}

			if _, err := h.upload.UploadBinary(c.Request.Context(), finalName, result.CaseId, f.Data); err != nil {
				uploadErrors = append(uploadErrors, "failed to upload "+finalName+": "+err.Error())
			}
		}

		if len(uploadErrors) > 0 {
			result.Error = "Claim submitted, but some files failed to upload: " + strings.Join(uploadErrors, "; ")
			log.Printf("[CAREARCPMClaim] Partial success: %s", result.Error)
		}
	}

	c.JSON(http.StatusOK, carEarCpmClaimResponse{
		Success: result.Success,
		Data:    &carEarCpmResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
