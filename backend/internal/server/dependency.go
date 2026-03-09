package server

import (
	"github.com/SHERATONS/backend/internal/config"
	"github.com/SHERATONS/backend/internal/handler"
	"github.com/SHERATONS/backend/internal/infra/line"
	"github.com/SHERATONS/backend/internal/infra/salesforce"
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

	// Repositories
	uploadRepo := salesforce.NewUploadRepo(sfClient)

	// Auth
	lineAuth := line.NewAuthVerifier(cfg.LiffChannelID)

	return Dependencies{
		Handlers: HandlerSet{
			FRIAR:    handler.NewFRIARClaimHandler(salesforce.NewFRIARClaimRepo(sfClient), uploadRepo),
			Location: handler.NewLocationHandler(salesforce.NewLocationRepo(sfClient)),
			Policy:   handler.NewPolicyHandler(salesforce.NewPolicyRepo(sfClient)),
			Upload:   handler.NewUploadHandler(uploadRepo),
		},
		AuthMiddleware: middleware.Auth(lineAuth, cfg.SkipLiffAuth),
	}
}
