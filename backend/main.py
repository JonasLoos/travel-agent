from datetime import datetime, timedelta
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
async def search_flights(
    origin: str, 
    destination: str, 
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    #children: int = 0,
    #infants: int = 0,
    #travel_class: Optional[str] = None,  # ECONOMY, BUSINESS, FIRST
    max_price: Optional[int] = 100000,
    currency: str = "EUR",
    non_stop_only: str = 'false',
    max_results: int = 10,
    #included_airlines: Optional[str] = None,  # comma-separated codes
    #excluded_airlines: Optional[str] = None   # comma-separated codes
) -> str:    
    """Search for flights with comprehensive filtering options.
    
    Args:
        origin: Origin airport/city IATA code (e.g., 'BOS')
        destination: Destination airport/city IATA code (e.g., 'NYC') 
        departure_date: Departure date in YYYY-MM-DD format.
        return_date: Return date for round-trip (optional).
        adults: Number of adult travelers (1-9). Default is 1.
        max_price: Maximum price per traveler (optional). Default is 100000.
        currency: Currency code (USD, EUR, etc.). Default is EUR.
        non_stop_only: If true, only direct flights. Default is false.
        max_results: Maximum number of results to return. Default is 10. Please try to not exceed this.
    """
    try:
        params = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": departure_date,
            "adults": adults,
            "maxPrice": max_price,
            "currencyCode": currency,
            "max": max_results,
            "nonStop": non_stop_only
        }
        
        # Only add optional parameters if they have values
        if return_date is not None:
            params["returnDate"] = return_date
        if max_price is not None:
            params["maxPrice"] = max_price
            
        response = amadeus.shopping.flight_offers_search.get(**params)
        print(f"Args: {origin=}, destination={destination}, departure_date={departure_date}, return_date={return_date}, adults={adults}, max_price={max_price}, currency={currency}, non_stop_only={non_stop_only}, max_results={max_results}")        
        return json.dumps(response.data)
    except ResponseError as e:
        print(f"Error: {e}")
        print(f"Args: {origin=}, destination={destination}, departure_date={departure_date}, return_date={return_date}, adults={adults}, max_price={max_price}, currency={currency}, non_stop_only={non_stop_only}, max_results={max_results}")
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

@function_tool
async def permutations(
    departure_date_start: str,
    departure_date_end: str,
    return_date_start: Optional[str] = None,
    return_date_end: Optional[str] = None,
    min_days: int = 1,
    max_days: int = 7

    ) -> str:
    """Helper function to permutate flight options, to find the best flight options, for the users flexibility in dates.
    Creates lists for departure_date and return_date. Then permutates all combinations. Limits permutations to where departure_date is before return_date.
    The results is formatted in a way that search_flights can be called for each permutation.

    Args:
    - departure_date_start: Departure earliest date in YYYY-MM-DD format
    - departure_date_end: Departure latest date in YYYY-MM-DD format
    - return_date_start: Return earliest date in YYYY-MM-DD format (optional). Default is None.
    - return_date_end: Return latest date in YYYY-MM-DD format (optional). Default is None.
    - min_days: Minimum trip duration in days (return_date - departure_date). Default is 1.
    - max_days: Maximum trip duration in days (return_date - departure_date). Default is 7.

    """
    try:
        # Generate departure dates
        start = datetime.strptime(departure_date_start, "%Y-%m-%d")
        end = datetime.strptime(departure_date_end, "%Y-%m-%d")
        
        departures = []
        current = start
        while current <= end:
            departures.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
        
        # Generate return dates if provided
        returns = []
        if return_date_start and return_date_end:
            ret_start = datetime.strptime(return_date_start, "%Y-%m-%d")
            ret_end = datetime.strptime(return_date_end, "%Y-%m-%d")
            
            current = ret_start
            while current <= ret_end:
                returns.append(current.strftime("%Y-%m-%d"))
                current += timedelta(days=1)
        
        # Create permutations with trip duration limits
        perms = []
        for dep in departures:
            if returns:
                for ret in returns:
                    if dep < ret:  # departure before return
                        trip_days = (datetime.strptime(ret, "%Y-%m-%d") - datetime.strptime(dep, "%Y-%m-%d")).days
                        if min_days <= trip_days <= max_days:
                            perms.append({"departure_date": dep, "return_date": ret})
            else:
                perms.append({"departure_date": dep})
        
        return json.dumps(perms)
    except Exception as e:
        return json.dumps({"error": str(e)})


# TODO: remove old sessions from database
travel_agent = Agent(
    name="Travel Agent",
    instructions="""
    Your Job:
    - You are a travel agent with access to real-time travel data. Help users find flights and travel information using the available tools.
    - You have capabilities to search for flights, and find all possible permutations of flights, to find the best flight options.

    Guidelines:
    - If a tools returns 400, make sure the arguments. 
    - Only display verified information gathered from the API tools. 
    - If information is missing, say this. Ask clarifying questions to the user. 
    - Don't show flights that wouldn't make sense to any user, e.g. if a  normally 1 hour flight takes >10 hours.
    
    Before you search for any flights:
    - get current date and time, and use it to calculate the best flight options.
    1. Always ask users about their preferences: 
    - Departure and Return dates, 
    - If they are flexible with dates (for permutations),
        -> Whath their minimum and maximum amount of stay is 
    - Max. price,
    - Number of travelers, 
    - If its one-way or round-trip,
    - Whether they want direct flights to provide the best recommendations.
    2. Use the search_locations tool for city to airport codes.
    3. Use the permutations tool to find all possible flight date combinations.
    4. Use the search_flights tool for the flights search.

    With search_flights you can search for:
    - Round-trip and one-way flights
    - Multiple travelers
    - Direct flights or with connections
    - Specific price ranges
    
    For every flight search, return at least the following information in structured format:
    - Departure and arrival airports
    - Departure and arrival times
    - Duration
    - Price
    - Flight Number (carrier + flight number)
    - Airline
    """,

    tools=[search_locations, search_flights, search_hotels, get_date_time, permutations]
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
