package server

import (
	"context"
	"log"

	"github.com/SHERATONS/backend/internal/config"
	"github.com/SHERATONS/backend/internal/handler"
	"github.com/SHERATONS/backend/internal/infra/gcs"
	"github.com/SHERATONS/backend/internal/infra/line"
	"github.com/SHERATONS/backend/internal/infra/salesforce"
	"github.com/SHERATONS/backend/internal/infra/vertex"
	"github.com/SHERATONS/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// Dependencies holds all wired handlers and middleware, built once at startup.
type Dependencies struct {
	Handlers       HandlerSet
	AuthMiddleware gin.HandlerFunc
}

// BuildDependencies wires all concrete implementations to their domain interfaces.
// This is the only place in the codebase that knows about concrete types.
// To add a new claim type:
//  1. Add its repo: e.g. salesforce.NewAHDeathClaimRepo(sfClient)
//  2. Add its handler: e.g. handler.NewAHDeathClaimHandler(ahDeathRepo, uploadRepo)
//  3. Add to HandlerSet below
//  4. Register its route in routes.go
func BuildDependencies(cfg config.Config) Dependencies {
	// Shared Salesforce client
	sfClient := salesforce.NewClient(cfg.Salesforce)

	// GCS Client
	gcsClient, err := gcs.NewClient(context.Background(), cfg.GCSBucketName)
	if err != nil {
		log.Fatalf("Failed to initialize GCS client: %v", err)
	}

	// Repositories
	uploadRepo := salesforce.NewUploadRepo(sfClient)

	// Auth
	lineAuth := line.NewAuthVerifier(cfg.LiffChannelID)

	// Vertex AI Content Generator
	geminiClient, err := vertex.NewGeminiClient(context.Background(), cfg.VertexProjectID, cfg.VertexLocation, cfg.SystemPrompt)
	if err != nil {
		log.Fatalf("Failed to initialize Vertex AI client: %v", err)
	}

	return Dependencies{
		Handlers: HandlerSet{
			FRIAR:       handler.NewFRIARClaimHandler(salesforce.NewFRIARClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			AHDeath:     handler.NewAHDeathClaimHandler(salesforce.NewAHDeathClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			CAREARCPM:   handler.NewCAREARCPMClaimHandler(salesforce.NewCAREARCPMClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			Drone:       handler.NewDroneClaimHandler(salesforce.NewDroneClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			Golf:        handler.NewGolfClaimHandler(salesforce.NewGolfClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			MarineCargo: handler.NewMarineCargoClaimHandler(salesforce.NewMarineCargoClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			MarineCL:    handler.NewMarineCLClaimHandler(salesforce.NewMarineCLClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			MarineHull:  handler.NewMarineHullClaimHandler(salesforce.NewMarineHullClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			Other:       handler.NewOtherClaimHandler(salesforce.NewOtherClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			Pet:         handler.NewPetClaimHandler(salesforce.NewPetClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			TA:          handler.NewTAClaimHandler(salesforce.NewTAClaimRepo(sfClient), uploadRepo, gcsClient, geminiClient),
			Location:    handler.NewLocationHandler(salesforce.NewLocationRepo(sfClient)),
			Policy:      handler.NewPolicyHandler(salesforce.NewPolicyRepo(sfClient)),
			Upload:      handler.NewUploadHandler(uploadRepo, gcsClient),
			Content:     handler.NewContentHandler(geminiClient),
			Line:        handler.NewLineWebhookHandler(cfg.Line),
			ExtraUpload: handler.NewExtraUploadHandler(uploadRepo, gcsClient, geminiClient),
		},
		AuthMiddleware: middleware.Auth(lineAuth, cfg.SkipLiffAuth),
	}
}
