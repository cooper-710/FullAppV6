from backend.api.server import app  # original app
from backend.api.players_search_override import attach_players_search

attach_players_search(app)
