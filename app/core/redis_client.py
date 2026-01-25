from redis import Redis
from app.core.config import settings

redis_cli = Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    decode_responses=True
)