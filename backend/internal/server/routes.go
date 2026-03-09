package server

import (
	"github.com/SHERATONS/backend/internal/handler"
	"github.com/gin-gonic/gin"
)

// HandlerSet groups all injected HTTP handlers.
type HandlerSet struct {
	FRIAR    *handler.FRIARClaimHandler
	Location *handler.LocationHandler
	Policy   *handler.PolicyHandler
	Upload   *handler.UploadHandler
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
	auth.POST("/api/claims/friar", deps.Handlers.FRIAR.Handle)
}
