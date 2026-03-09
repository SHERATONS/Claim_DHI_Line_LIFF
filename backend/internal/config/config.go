package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	SkipLiffAuth   bool
	LiffChannelID  string
	AllowedOrigins []string
	Salesforce     SalesforceConfig
}

type SalesforceConfig struct {
	TokenURL     string
	ClientID     string
	ClientSecret string
	InstanceURL  string
}

// Load reads all environment variables once and returns a Config.
// PORT is intentionally excluded — Cloud Run injects it and it must not be overridden.
func Load() Config {
	allowedOrigins := []string{
		"https://liff.line.me",
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000",
	}
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if o = strings.TrimSpace(o); o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		Port:           port,
		SkipLiffAuth:   os.Getenv("SKIP_LIFF_AUTH") == "true",
		LiffChannelID:  os.Getenv("LIFF_CHANNEL_ID"),
		AllowedOrigins: allowedOrigins,
		Salesforce: SalesforceConfig{
			TokenURL:     os.Getenv("SF_TOKEN_URL"),
			ClientID:     os.Getenv("SF_CLIENT_ID"),
			ClientSecret: os.Getenv("SF_CLIENT_SECRET"),
			InstanceURL:  os.Getenv("SF_INSTANCE_URL"),
		},
	}
}
