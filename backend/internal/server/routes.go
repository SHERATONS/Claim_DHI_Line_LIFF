package server

import (
	"github.com/SHERATONS/backend/internal/handler"
	"github.com/gin-gonic/gin"
)

// HandlerSet groups all injected HTTP handlers.
type HandlerSet struct {
	FRIAR       *handler.FRIARClaimHandler
	AHDeath     *handler.AHDeathClaimHandler
	CAREARCPM   *handler.CAREARCPMClaimHandler
	Drone       *handler.DroneClaimHandler
	Golf        *handler.GolfClaimHandler
	MarineCargo *handler.MarineCargoClaimHandler
	MarineCL    *handler.MarineCLClaimHandler
	MarineHull  *handler.MarineHullClaimHandler
	Other       *handler.OtherClaimHandler
	Pet         *handler.PetClaimHandler
	TA          *handler.TAClaimHandler
	Location    *handler.LocationHandler
	Policy      *handler.PolicyHandler
	Upload      *handler.UploadHandler
  Content     *handler.ContentHandler
}

// SetupRoutes registers all application routes.
func (s *GinServer) SetupRoutes(deps Dependencies) {
	// Public routes
	s.engine.GET("/test", func(c *gin.Context) { c.String(200, "Hello World") })
	s.engine.GET("/api/locations", deps.Handlers.Location.GetLocations)

	// Protected routes (LIFF auth required)
	auth := s.engine.Group("/")
	auth.Use(deps.AuthMiddleware)
	auth.POST("/api/upload", deps.Handlers.Upload.UploadBinary)
	auth.POST("/api/policy", deps.Handlers.Policy.LookupPolicy)
  auth.POST("/api/generate", deps.Handlers.Content.GenerateContent)
	auth.POST("/api/test/analyze", deps.Handlers.Content.AnalyzeClaimTest)
	auth.POST("/api/claims/friar", deps.Handlers.FRIAR.Handle)
	auth.POST("/api/claims/ahdeath", deps.Handlers.AHDeath.Handle)
	auth.POST("/api/claims/carearcpm", deps.Handlers.CAREARCPM.Handle)
	auth.POST("/api/claims/drone", deps.Handlers.Drone.Handle)
	auth.POST("/api/claims/golf", deps.Handlers.Golf.Handle)
	auth.POST("/api/claims/marinecargo", deps.Handlers.MarineCargo.Handle)
	auth.POST("/api/claims/marinecl", deps.Handlers.MarineCL.Handle)
	auth.POST("/api/claims/marinehull", deps.Handlers.MarineHull.Handle)
	auth.POST("/api/claims/other", deps.Handlers.Other.Handle)
	auth.POST("/api/claims/pet", deps.Handlers.Pet.Handle)
	auth.POST("/api/claims/ta", deps.Handlers.TA.Handle)
}
