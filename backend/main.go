package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/SHERATONS/backend/internal/config"
	"github.com/SHERATONS/backend/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	cfg := config.Load()
	deps := server.BuildDependencies(cfg)

	s := server.NewGinServer(cfg)
	s.SetupRoutes(deps)

	go func() {
		log.Printf("[Server] Starting on :%s", cfg.Port)
		if err := s.Start(":" + cfg.Port); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Server] Failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	log.Println("[Server] Shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.Shutdown(ctx); err != nil {
		log.Printf("[Server] Forced shutdown: %v", err)
	}
	log.Println("[Server] Stopped")
}
