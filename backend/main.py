from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from dotenv import load_dotenv
from agents import Agent, Runner, SQLiteSession
from agents import function_tool
import os
from amadeus import Client, ResponseError

# Load environment variables
load_dotenv()

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
# TODO: remove old sessions from database
travel_agent = Agent(
    name="Travel Agent",
    instructions="""You are a travel agent with access to real-time travel data. Help users find flights, hotels, and travel information using the available tools. If a tools returns 400, make sure the arguments are correct and try again up to 3 times. Only display verified information gathered from the API tools. If information is missing, say this. Ask clarifying questions to the user. Don't show crazy travel options like intracontinental flights that take >10 hours.""",
    tools=[search_locations, search_flights, search_hotels, get_date_time]
)

@app.get("/")
async def root():
    return {"message": "Minimal Travel Agent API"}

@app.post("/chat")
async def chat_with_agent(message: ChatMessage):
    try:
        session_id = message.session_id or "default_session"
        session = SQLiteSession(session_id, "travel_agent_sessions.db")

        result = await Runner.run(
            travel_agent,
            message.message,
            session=session
        )

        return {
            "response": result.final_output,
            "session_id": session_id,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
