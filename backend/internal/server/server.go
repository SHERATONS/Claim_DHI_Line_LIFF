package server

import (
	"context"
	"net/http"
	"time"

	"github.com/SHERATONS/backend/internal/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type GinServer struct {
	engine     *gin.Engine
	httpServer *http.Server
}

func NewGinServer(cfg config.Config) *GinServer {
	engine := gin.New()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.AllowedOrigins
	corsConfig.AllowMethods = []string{
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
	}

	corsConfig.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Accept",
		"Authorization",
		"X-Requested-With",
		"X-File-Name",
		"X-Case-Id",
	}
	
	corsConfig.AllowCredentials = true
	corsConfig.MaxAge = 12 * time.Hour

	engine.Use(gin.Logger())
	engine.Use(gin.Recovery())
	engine.Use(cors.New(corsConfig))

	return &GinServer{engine: engine}
}

func (s *GinServer) Start(port string) error {
	s.httpServer = &http.Server{Addr: port, Handler: s.engine}
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully drains in-flight requests before stopping.
// Cloud Run sends SIGTERM and expects the process to exit within 10 seconds.
func (s *GinServer) Shutdown(ctx context.Context) error {
	if s.httpServer == nil {
		return nil
	}
	return s.httpServer.Shutdown(ctx)
}
