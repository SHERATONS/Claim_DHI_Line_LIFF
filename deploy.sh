#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# DEPLOY SCRIPT
#
# FIRST TIME SETUP:
#   1. cp deploy.env.example deploy.env
#   2. Fill in secrets in deploy.env
#   3. chmod +x deploy.sh
#   4. Authenticate gcloud:  gcloud auth login
#   5. Set project:          gcloud config set project YOUR_GCP_PROJECT_ID
#
# USAGE:
#   ./deploy.sh             → deploy both backend and frontend
#   ./deploy.sh backend     → backend only  (Cloud Run)
#   ./deploy.sh frontend    → frontend only (Cloud Run)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"

# ── Load secrets ─────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: deploy.env not found."
  echo "Run:   cp deploy.env.example deploy.env   then fill in your secrets."
  exit 1
fi
# shellcheck source=deploy.env.example
source "$ENV_FILE"

# ── Ensure gcloud is in PATH (handles macOS Homebrew install) ────────────────
if ! command -v gcloud &>/dev/null; then
  export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH
fi
if ! command -v gcloud &>/dev/null; then
  echo "ERROR: gcloud not found. Install the Google Cloud SDK first."
  echo "  https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# BACKEND — builds from source and deploys to Cloud Run
#
# Notes:
#   - PORT is intentionally excluded from --set-env-vars
#     Cloud Run injects PORT automatically. Setting it causes a conflict.
#   - --allow-unauthenticated enables public access (LIFF auth is handled by
#     the backend middleware, not by IAM).
#   - --source . uses Cloud Build to build the Docker image from Dockerfile.
# ─────────────────────────────────────────────────────────────────────────────
deploy_backend() {
  echo ""
  echo "══════════════════════════════════════"
  echo "  Deploying backend → Cloud Run"
  echo "══════════════════════════════════════"

  cd "$SCRIPT_DIR/backend"

  gcloud run deploy "$CR_SERVICE_NAME" \
    --source . \
    --region "$CR_REGION" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "\
SF_TOKEN_URL=$SF_TOKEN_URL,\
SF_CLIENT_ID=$SF_CLIENT_ID,\
SF_CLIENT_SECRET=$SF_CLIENT_SECRET,\
SF_INSTANCE_URL=$SF_INSTANCE_URL,\
LIFF_CHANNEL_ID=$LIFF_CHANNEL_ID,\
SKIP_LIFF_AUTH=$SKIP_LIFF_AUTH,\
ALLOWED_ORIGINS=$ALLOWED_ORIGINS"

  echo ""
  
  echo "Backend deployed."
}

# ─────────────────────────────────────────────────────────────────────────────
# FRONTEND — builds from source and deploys to Cloud Run (nginx + Vite SPA)
#
# Notes:
#   - The Dockerfile uses a multi-stage build:
#     1. Node/pnpm stage: installs deps and runs `pnpm build`
#     2. nginx stage: serves the static files from dist/
#   - --allow-unauthenticated enables public access (LIFF handles auth).
#   - --source . uses Cloud Build to build the Docker image from Dockerfile.
# ─────────────────────────────────────────────────────────────────────────────
deploy_frontend() {
  echo ""
  echo "══════════════════════════════════════"
  echo "  Deploying frontend → Cloud Run"
  echo "══════════════════════════════════════"

  cd "$SCRIPT_DIR/front-end"

  # Generate a temporary .env.production file so Vite can bake these variables into the build
  # during the Docker 'COPY . .' step.
  cat <<EOF > .env.production
VITE_API_URL=https://claim-backend-159899010776.asia-southeast1.run.app
VITE_LIFF_ID=$LIFF_CHANNEL_ID-DpJyQIAL
VITE_USE_LOCAL_SAVE=false
EOF
  
  gcloud run deploy "$CR_FRONTEND_SERVICE_NAME" \
    --source . \
    --region "$CR_REGION" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080

  echo ""
  echo "Frontend deployed."
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
TARGET="${1:-all}"

case "$TARGET" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  all)      deploy_backend && deploy_frontend ;;
  *)
    echo "Usage: $0 [backend|frontend|all]"
    exit 1
    ;;
esac

echo ""
echo "Done."
