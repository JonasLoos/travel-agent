# Travel Agent AI

An intelligent travel agent powered by AI that helps users find flights and travel information using real-time data from the Amadeus API.

## Features

- 🤖 **AI-Powered Conversations** - Natural language interaction with an intelligent travel agent
- ✈️ **Real-Time Flight Search** - Search flights with comprehensive filtering options
- 🗺️ **Location Search** - Find airports and cities by keyword
- 🏨 **Hotel Search** - Discover available hotels in destinations
- 🎤 **Voice Interface** - Text-to-speech and speech-to-text capabilities
- 📅 **Flexible Date Permutations** - Find optimal flight combinations across date ranges
- 💰 **Price Filtering** - Set maximum budgets and currency preferences
- 🔄 **Session Management** - Persistent conversation history

## Tech Stack

- **Backend**: FastAPI, Python
- **Frontend**: React, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT, Whisper, TTS
- **Travel Data**: Amadeus API
- **Database**: SQLite (for session management)

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- API Keys:
  - OpenAI API Key
  - Amadeus Client ID & Secret

### Environment Setup

Create a `.env` file in the backend directory:

```bash
OPENAI_API_KEY=your_openai_api_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Chat
- `POST /chat` - Send messages to the travel agent
- `POST /text-to-speech` - Convert text to speech
- `POST /speech-to-text` - Convert speech to text

### Travel Functions
- **Flight Search**: Round-trip and one-way flights with filtering
- **Location Search**: Find airports and cities
- **Hotel Search**: Discover accommodation options
- **Date Permutations**: Optimize travel dates for best prices

## Usage Examples

The travel agent can help with queries like:
- "I need a flight from New York to London next month"
- "Find me the cheapest flights to Tokyo in March"
- "I want to go to Paris for 5 days, flexible dates"
- "Show me direct flights to Bangkok under $800"

## Development

The project uses:
- **FastAPI** for the backend API
- **Amadeus API** for real-time travel data
- **OpenAI** for AI conversations and voice processing
- **SQLite** for session persistence
- **React + TypeScript** for the frontend interface

## License

MIT License
