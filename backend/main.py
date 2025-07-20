from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
import io
import base64
from dotenv import load_dotenv
from agents import Agent, Runner, SQLiteSession
from agents import function_tool
import os
from amadeus import Client, ResponseError
import openai
import tempfile


DATABASE_PATH = Path("travel_agent_sessions.db")
if DATABASE_PATH.exists():
    DATABASE_PATH.unlink() # delete previous database file if it exists

# Load environment variables
load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# Initialize Amadeus client
amadeus = Client(
    client_id=os.getenv('AMADEUS_CLIENT_ID'),
    client_secret=os.getenv('AMADEUS_CLIENT_SECRET')
)

# Set to test environment for development
amadeus.test = True

app = FastAPI(title="Minimal Travel Agent", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class TextToSpeechRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"

@function_tool
async def get_date_time() -> str:
    """Get the current date and time."""
    return datetime.now().isoformat()


# Travel API functions
@function_tool
async def search_locations(keyword: str) -> str:
    """Search for airports and cities by keyword (e.g., 'Bangkok', 'BKK', 'Thailand').
    
    Args:
        keyword: The keyword to search for.
    """
    try:
        response = amadeus.reference_data.locations.get(
            keyword=keyword,
            subType="CITY,AIRPORT"
        )
        return json.dumps(response.data)
    except ResponseError as e:
        print(f"Error: {e}")
        print(f"Args: {keyword}")
        return json.dumps({"error": str(e)})

@function_tool
async def search_flights(origin: str, destination: str, date: str) -> str:
    """Search for available flights between two cities on a specific date.
    
    Args:
        origin: Origin airport/city IATA code (e.g., 'BOS')
        destination: Destination airport/city IATA code (e.g., 'NYC')
        date: The date, or range of dates, on which the flight will depart from the origin. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2017-12-25.
    """
    try:
        response = amadeus.shopping.flight_offers_search.get(
            originLocationCode=origin,
            destinationLocationCode=destination,
            departureDate=date,
            adults=1,
            max=10,
        )
        return json.dumps(response.data)
    except ResponseError as e:
        print(f"Error: {e}")
        print(f"Args: {origin}, {destination}, {date}")
        return json.dumps({"error": str(e)})

@function_tool
async def search_hotels(city: str) -> str:
    """Search for available hotels in a city.
    
    Args:
        city: The city to search for.
    """
    try:
        response = amadeus.reference_data.locations.hotels.by_city.get(
            cityCode=city,
        )
        return json.dumps(response.data)
    except ResponseError as e:
        print(f"Error: {e}")
        print(f"Args: {city}")
        return json.dumps({"error": str(e)})

# Create minimal travel agent
travel_agent = Agent(
    name="Travel Agent",
    instructions="""You are a travel agent with access to real-time travel data. Help users find flights, hotels, and travel information using the available tools. If a tools returns 400, make sure the arguments are correct and try again up to 3 times. Only display verified information gathered from the API tools. If information is missing, say this. Ask clarifying questions to the user. Before using API tools, specify a rough range of expected results, e.g. flight duration, so you can later filter out results that don't make sense, if necessary. Don't show flights that don't make sense to the user, e.g. if they take way too long.""",
    tools=[search_locations, search_flights, search_hotels, get_date_time]
)

@app.get("/")
async def root():
    return {"message": "Minimal Travel Agent API"}

@app.post("/chat")
async def chat_with_agent(message: ChatMessage):
    try:
        session = SQLiteSession(message.session_id, DATABASE_PATH)

        result = await Runner.run(
            travel_agent,
            message.message,
            session=session
        )

        return {
            "response": result.final_output,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert text to speech using OpenAI's TTS API"""
    try:
        # Use OpenAI's TTS API
        response = openai.audio.speech.create(
            model="tts-1",
            voice=request.voice,
            input=request.text
        )
        
        # Get the audio data
        audio_data = response.content
        
        # Convert to base64 for frontend
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return {
            "audio": audio_base64,
            "format": "mp3",
            "text": request.text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech error: {str(e)}")

@app.post("/speech-to-text")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """Convert speech to text using OpenAI's Whisper API"""
    try:
        # Read audio file
        audio_data = await audio_file.read()
        
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        try:
            # Use OpenAI's Whisper API
            with open(temp_path, "rb") as audio_file:
                transcript = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            return {
                "text": transcript,
                "confidence": 1.0
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech-to-text error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
