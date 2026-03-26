package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/internal/infra/gcs"
	"github.com/SHERATONS/backend/internal/infra/salesforce"
	"github.com/SHERATONS/backend/internal/infra/vertex"
)

type AsyncWorker struct {
	gemini    *vertex.GeminiClient
	gcs       *gcs.Client
	sfUpdate  *salesforce.UpdateRepo
	sfUpload  *salesforce.UploadRepo
}

func NewAsyncWorker(g *vertex.GeminiClient, gc *gcs.Client, u *salesforce.UpdateRepo, up *salesforce.UploadRepo) *AsyncWorker {
	return &AsyncWorker{
		gemini:   g,
		gcs:      gc,
		sfUpdate: u,
		sfUpload: up,
	}
}

type BackgroundContext struct {
	NotificationNo string
	CaseId         string
	PolicyNo       string
	ContactId      string
	PolicyHolder   string
	FlightNumber   string
	Files          []domain.FileInput // Contaning GCSURIs
}

func (w *AsyncWorker) ProcessClaim(ctx context.Context, bg BackgroundContext) {
	log.Printf("[AsyncWorker] Starting processing for notificationNo=%s, caseId=%s", bg.NotificationNo, bg.CaseId)

	hasFiles := len(bg.Files) > 0
	hasFlightNumber := bg.FlightNumber != ""

	// Nothing to process in background
	if !hasFiles && !hasFlightNumber {
		log.Printf("[AsyncWorker] No files and no flight number for %s, skipping.", bg.NotificationNo)
		return
	}

	// ── 1. AI Analysis (only if files exist) ────────────────────────────────
	var analysis *domain.ClaimAnalysisResult
	if hasFiles {
		form := map[string]string{
			"policyNo":     bg.PolicyNo,
			"contactId":    bg.ContactId,
			"policyHolder": bg.PolicyHolder,
			"flightNumber": bg.FlightNumber,
		}

		var err error
		analysis, err = w.gemini.AnalyzeClaim(ctx, form, bg.Files)
		if err != nil {
			log.Printf("[AsyncWorker] AI Analysis failed for %s: %v", bg.NotificationNo, err)
			// Continue — we may still do flight search
		} else {
			log.Printf("[AsyncWorker] AI Analysis complete for %s. Found %d files.", bg.NotificationNo, len(analysis.FileNames))
		}
	}

	// ── 2. Upload Renamed Files to Salesforce ───────────────────────────────
	if hasFiles && analysis != nil {
		for _, f := range bg.Files {
			newName := f.Filename
			for _, ren := range analysis.FileNames {
				if ren.Original == f.Filename {
					newName = ren.New
					break
				}
			}

			objectName := f.GCSURI[len("gs://")+len(w.gcs.GetBucketName())+1:]

			data, err := w.gcs.ReadFile(ctx, objectName)
			if err != nil {
				log.Printf("[AsyncWorker] Failed to read file %s from GCS: %v", f.Filename, err)
				continue
			}

			_, err = w.sfUpload.UploadBinary(ctx, newName, bg.CaseId, data)
			if err != nil {
				log.Printf("[AsyncWorker] Failed to upload renamed file %s to Salesforce: %v", newName, err)
				continue
			}
			log.Printf("[AsyncWorker] Uploaded renamed file: %s -> %s", f.Filename, newName)
		}
	}

	// ── 3. Flight Search (only for TA claims with flight number) ────────────
	var flightDetails string
	if hasFlightNumber {
		var err error
		flightDetails, err = w.gemini.SearchFlightDetails(ctx, bg.FlightNumber)
		if err != nil {
			log.Printf("[AsyncWorker] Flight search failed for %s (flight %s): %v", bg.NotificationNo, bg.FlightNumber, err)
			// Non-fatal — continue without flight details
		} else {
			log.Printf("[AsyncWorker] Flight search complete for %s: %s", bg.NotificationNo, bg.FlightNumber)
		}
	}

	// ── 4. Build combined summary & update Case ─────────────────────────────
	combinedSummary := buildCombinedSummary(analysis, flightDetails)
	if combinedSummary == "" {
		log.Printf("[AsyncWorker] No summary to update for %s (both analysis and flight search failed).", bg.NotificationNo)
		return
	}

	err := w.sfUpdate.UpdateCaseAnalysis(ctx, bg.NotificationNo, combinedSummary)
	if err != nil {
		log.Printf("[AsyncWorker] Failed to update Case analysis for %s: %v", bg.NotificationNo, err)
		return
	}

	log.Printf("[AsyncWorker] Successfully processed background tasks for %s", bg.NotificationNo)
}

// buildCombinedSummary assembles a formatted string from AI analysis and flight details.
// Format:
//
//	verification: PolicyNo <status>, ContactId <status>, PolicyHolder <status>
//	summary: <AI summary in Thai>
//	flight details: <real-time flight info>
func buildCombinedSummary(analysis *domain.ClaimAnalysisResult, flightDetails string) string {
	var parts []string

	if analysis != nil {
		v := analysis.Verification
		parts = append(parts, fmt.Sprintf("verification: PolicyNo %s, ContactId %s, PolicyHolder %s",
			v.PolicyNo, v.ContactId, v.PolicyHolder))
		if analysis.Summary != "" {
			parts = append(parts, "summary: "+analysis.Summary)
		}
	}

	if flightDetails != "" {
		parts = append(parts, "flight details: "+flightDetails)
	}

	return strings.Join(parts, "\n")
}

