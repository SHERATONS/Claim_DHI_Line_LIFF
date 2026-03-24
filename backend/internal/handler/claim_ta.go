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
	repo    claim.TAClaimRepository
	upload  domain.UploadRepository
	storage domain.StorageRepository
	gen     domain.ContentGenerator
}

func NewTAClaimHandler(repo claim.TAClaimRepository, upload domain.UploadRepository, storage domain.StorageRepository, gen domain.ContentGenerator) *TAClaimHandler {
	return &TAClaimHandler{repo: repo, upload: upload, storage: storage, gen: gen}
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
			log.Printf("[TAClaim] AI Analysis failed: %v", err)
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
		log.Printf("[TAClaim] ERROR: %v", err)
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
			log.Printf("[TAClaim] Partial success: %s", result.Error)
		}
	}

	c.JSON(http.StatusOK, taClaimResponse{
		Success: result.Success,
		Data:    &taResultData{NotificationNo: result.NotificationNo, CaseNumber: result.CaseNumber, CaseId: result.CaseId},
		Error:   result.Error,
	})
}
