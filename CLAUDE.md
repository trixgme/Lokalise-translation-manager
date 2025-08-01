# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build
npm start  

# Code quality
npm run lint
npm run type-check  # TypeScript type checking
```

## Environment Setup

Required environment variables in `.env.local`:

```env
# Lokalise API Configuration
LOKALISE_API_TOKEN=your_lokalise_api_token_here
LOKALISE_PROJECT_ID=your_project_id_here

# OpenAI Configuration (fallback for translation)
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Architecture Overview

This is a Next.js 15 application that integrates with Lokalise API for translation key management and provides AI-powered translation capabilities.

### Core Components

- **Frontend**: React 19 with TypeScript, styled with Tailwind CSS
- **Backend**: Next.js API routes for Lokalise and OpenAI integration
- **Translation Flow**: Dual AI system (Lokalise AI primary, OpenAI fallback)

### Key Directories

- `src/lib/lokalise.ts` - Lokalise API client with full CRUD operations
- `src/lib/openai.ts` - OpenAI integration for fallback translation (default model: GPT-4.1)
- `src/types/lokalise.ts` - TypeScript definitions for Lokalise API responses
- `src/app/api/` - API routes for keys, translation, and language management

### API Architecture

The application uses a hybrid translation approach:

1. **Primary**: Lokalise AI auto-translation via `translateKeys()`
2. **Fallback**: OpenAI GPT-4.1 when Lokalise AI fails
3. **Manual**: Direct translation updates via `updateTranslation()`

Key API endpoints:
- `GET /api/keys` - Fetch all translation keys with translations
- `POST /api/keys` - Create new keys with optional AI translation
- `POST /api/translate` - Batch translate existing keys
- `GET /api/languages` - Get project languages

### Translation Key Management

Keys are created with:
- Multi-platform support (web, iOS, Android)  
- Optional descriptions for context
- Automatic translation to all project languages when AI is enabled
- Real-time sync with Lokalise project

### Error Handling Pattern

The codebase implements graceful degradation:
- Lokalise API failures fall back to OpenAI
- Individual translation failures don't block batch operations
- API errors return structured error responses with appropriate HTTP status codes