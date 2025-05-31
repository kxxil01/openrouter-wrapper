#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Claude Opus 4 Wrapper...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}Error: Node.js version 18 or higher is required. Current version: $NODE_VERSION${NC}"
  exit 1
fi

# Install dependencies for the main package
echo -e "${YELLOW}Installing main dependencies...${NC}"
npm install

# Install dependencies for the web UI
echo -e "${YELLOW}Installing web UI dependencies...${NC}"
cd web && npm install && cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from template...${NC}"
  cp .env.example .env
  echo -e "${GREEN}Created .env file. Please edit it with your OpenRouter API key.${NC}"
else
  echo -e "${BLUE}Using existing .env file${NC}"
fi

# Check if OpenRouter API key is set
if grep -q "OPENROUTER_API_KEY=your-api-key" .env; then
  echo -e "${YELLOW}Warning: OpenRouter API key is not set in .env file.${NC}"
  echo -e "${YELLOW}Please edit the .env file and set your OpenRouter API key.${NC}"
fi

# Build the web UI
echo -e "${YELLOW}Building web UI...${NC}"
npm run build

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${BLUE}To start the application, run:${NC}"
echo -e "  npm start"
echo -e "${BLUE}To start the development server, run:${NC}"
echo -e "  npm run dev"

echo -e "\n${YELLOW}Note: Make sure you've set your OpenRouter API key in the .env file.${NC}"
