# VibeFlow AI

## Overview
VibeFlow AI is a React + TypeScript music application that uses the Google Gemini AI service.

## Project Structure
- `/components/` - React components (Layout, Player)
- `/contexts/` - React context providers (AudioContext)
- `/pages/` - Page components (Home, Library)
- `/services/` - API and service files (api.ts, db.ts, geminiService.ts)
- `App.tsx` - Main application component
- `index.tsx` - Application entry point
- `types.ts` - TypeScript type definitions

## Tech Stack
- React 19 with TypeScript
- Vite for build/dev
- Lucide React for icons
- Google Gemini AI integration

## Development
- Run: `npm run dev` (port 5000)
- Build: `npm run build`

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (required for AI features)
