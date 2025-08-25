#!/bin/bash

# Complete Docker Build Script for Proxy Account Outreach System
# Builds Docker image with comprehensive data support

set -e

echo "🚀 Building Complete Proxy Account Outreach Docker System"
echo "============================================================"

# Configuration
IMAGE_NAME="proxy-outreach-complete"
TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check for existing image and offer to remove it
if docker images | grep -q "${IMAGE_NAME}"; then
    print_warning "Existing ${IMAGE_NAME} image found"
    read -p "Do you want to remove the existing image? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing existing image..."
        docker rmi "${FULL_IMAGE_NAME}" 2>/dev/null || true
        print_success "Existing image removed"
    fi
fi

# Stop and remove existing container if running
if docker ps -a | grep -q "${IMAGE_NAME}"; then
    print_status "Stopping and removing existing container..."
    docker stop "${IMAGE_NAME}" 2>/dev/null || true
    docker rm "${IMAGE_NAME}" 2>/dev/null || true
    print_success "Existing container removed"
fi

# Check for required data files
print_status "Checking for required data files..."

REQUIRED_FILES=(
    "df_2025_279_account_voted_sorted_20250817.csv"
    "df_2025_279_account_unvoted_sorted_20250817.csv"
    "matched_results_279.xlsx"
    "df_2025_sds_167_account_voted_sorted.parquet"
    "df_2025_sds_167_account_unvoted_sorted.parquet"
    "2025_predictions_sds_v2.1.csv"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    else
        print_success "Found: $file"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_error "Missing required data files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   ❌ $file"
    done
    echo ""
    print_error "Please ensure all required data files are present in the current directory."
    echo ""
    print_status "Required files mapping:"
    echo "   📊 proxy.account_voted <- df_2025_279_account_voted_sorted_20250817.csv"
    echo "   📊 proxy.account_unvoted <- df_2025_279_account_unvoted_sorted_20250817.csv"
    echo "   📈 proxy.proposals_predictions <- matched_results_279.xlsx"
    echo "   📋 proxy_sds.account_voted <- df_2025_sds_167_account_voted_sorted.parquet"
    echo "   📋 proxy_sds.account_unvoted <- df_2025_sds_167_account_unvoted_sorted.parquet"
    echo "   🎯 proxy_sds.proposals_predictions <- 2025_predictions_sds_v2.1.csv"
    exit 1
fi

print_success "All required data files found!"

# Create external data directory for user data (optional)
mkdir -p external-data/csv
mkdir -p external-data/excel
mkdir -p external-data/parquet
mkdir -p uploads

print_status "Created external data directories:"
print_status "  - external-data/csv/ (for CSV files)"
print_status "  - external-data/excel/ (for Excel files)"
print_status "  - external-data/parquet/ (for Parquet files)"
print_status "  - uploads/ (for application uploads)"

# Build the Docker image
print_status "Building Docker image: ${FULL_IMAGE_NAME}"
print_status "This may take several minutes..."

if docker build -f Dockerfile.complete -t "${FULL_IMAGE_NAME}" .; then
    print_success "Docker image built successfully!"
else
    print_error "Docker build failed!"
    exit 1
fi

# Show image information
print_status "Docker image information:"
docker images "${IMAGE_NAME}"

# Show build summary
echo
echo "🎉 Build Summary"
echo "================"
print_success "Image Name: ${FULL_IMAGE_NAME}"
print_success "Features Included:"
echo "   ✅ MySQL with proxy and proxy_sds databases"
echo "   ✅ Dual database architecture with specific data sources"
echo "   ✅ CSV import functionality"
echo "   ✅ Excel import functionality"
echo "   ✅ Parquet import functionality"
echo "   ✅ Node.js web application"
echo "   ✅ Comprehensive database schemas"
echo
print_success "Data Sources Included:"
echo "   📊 proxy.account_voted <- df_2025_279_account_voted_sorted_20250817.csv"
echo "   📊 proxy.account_unvoted <- df_2025_279_account_unvoted_sorted_20250817.csv"
echo "   📈 proxy.proposals_predictions <- matched_results_279.xlsx"
echo "   📋 proxy_sds.account_voted <- df_2025_sds_167_account_voted_sorted.parquet"
echo "   📋 proxy_sds.account_unvoted <- df_2025_sds_167_account_unvoted_sorted.parquet"
echo "   🎯 proxy_sds.proposals_predictions <- 2025_predictions_sds_v2.1.csv"

echo
echo "🚀 Next Steps:"
echo "=============="
echo
echo "1. Run with Docker Compose (recommended):"
echo "   ${GREEN}docker-compose -f docker-compose.complete.yml up -d${NC}"
echo
echo "2. Or run directly with Docker:"
echo "   ${GREEN}docker run -d --name proxy-outreach-complete -p 3000:3000 ${FULL_IMAGE_NAME}${NC}"
echo
echo "3. Access the application:"
echo "   ${GREEN}http://localhost:3000${NC}"
echo
echo "4. Monitor container logs:"
echo "   ${GREEN}docker logs -f proxy-outreach-complete${NC}"
echo
echo "5. Add your own data files:"
echo "   - Copy CSV files to: ${GREEN}external-data/csv/${NC}"
echo "   - Copy Excel files to: ${GREEN}external-data/excel/${NC}"
echo "   - Copy Parquet files to: ${GREEN}external-data/parquet/${NC}"
echo
echo "📊 Database Information:"
echo "======================="
echo "   - Primary Database: ${GREEN}proxy${NC} (main application data)"
echo "   - SDS Database: ${GREEN}proxy_sds${NC} (SDS-specific data)"
echo "   - Default User: ${GREEN}webapp${NC} / ${GREEN}webapppass${NC}"
echo "   - Root Password: ${GREEN}rootpass${NC}"
echo
echo "🔧 Troubleshooting:"
echo "==================="
echo "   - Check container status: ${GREEN}docker ps${NC}"
echo "   - View logs: ${GREEN}docker logs proxy-outreach-complete${NC}"
echo "   - Access container shell: ${GREEN}docker exec -it proxy-outreach-complete bash${NC}"
echo
print_success "Build completed successfully! 🎉"
