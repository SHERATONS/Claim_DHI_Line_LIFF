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
#   ./deploy.sh frontend    → frontend only (GCS)
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
# FRONTEND — builds with Vite and syncs to GCS
#
# Notes:
#   - gsutil rsync -d deletes files in the bucket that are no longer in dist/.
#     This keeps the bucket clean after file renames. Safe to use here.
#   - Cache-Control: no-cache is set on index.html so browsers always fetch
#     the latest entry point. JS/CSS assets use content-hash filenames so they
#     can be cached indefinitely (Vite handles this by default).
#   - .gz and .br are pre-compressed variants that GCS serves automatically
#     when Accept-Encoding is set. Silently skipped if they don't exist.
# ─────────────────────────────────────────────────────────────────────────────
deploy_frontend() {
  echo ""
  echo "══════════════════════════════════════"
  echo "  Building frontend"
  echo "══════════════════════════════════════"

  cd "$SCRIPT_DIR/front-end"
  pnpm run build

  echo ""
  echo "══════════════════════════════════════"
  echo "  Uploading frontend → GCS"
  echo "══════════════════════════════════════"

  gsutil -m rsync -r -d dist/ "gs://$GCS_BUCKET/"

  # Force browsers to re-fetch the HTML entry point on every visit.
  # Silently skip compressed variants if they weren't generated.
  gsutil -m setmeta \
    -h "Cache-Control:no-cache, no-store, must-revalidate" \
    "gs://$GCS_BUCKET/index.html" 2>/dev/null || true

  gsutil -m setmeta \
    -h "Cache-Control:no-cache, no-store, must-revalidate" \
    "gs://$GCS_BUCKET/index.html.gz" 2>/dev/null || true

  gsutil -m setmeta \
    -h "Cache-Control:no-cache, no-store, must-revalidate" \
    "gs://$GCS_BUCKET/index.html.br" 2>/dev/null || true

  echo ""
  echo "Frontend deployed."
  echo "  URL: https://storage.googleapis.com/$GCS_BUCKET/index.html"
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
