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
	repo    claim.AHDeathClaimRepository
	upload  domain.UploadRepository
	storage domain.StorageRepository
	gen     domain.ContentGenerator
}

func NewAHDeathClaimHandler(repo claim.AHDeathClaimRepository, upload domain.UploadRepository, storage domain.StorageRepository, gen domain.ContentGenerator) *AHDeathClaimHandler {
	return &AHDeathClaimHandler{repo: repo, upload: upload, storage: storage, gen: gen}
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
			log.Printf("[AHDeathClaim] AI Analysis failed: %v", err)
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
		log.Printf("[AHDeathClaim] ERROR: %v", err)
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
			log.Printf("[AHDeathClaim] Partial success: %s", result.Error)
		}
	}

	c.JSON(http.StatusOK, ahDeathClaimResponse{
		Success: result.Success,
		Data:    &ahDeathResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
