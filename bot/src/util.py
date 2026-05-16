import io
import os
from functools import lru_cache
from typing import List

import httpx
import psycopg
from PIL import Image
from psycopg_pool import ConnectionPool
from uuid import UUID


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")
    return database_url

@lru_cache(maxsize=1)
def _get_connection_pool() -> ConnectionPool:
    pool = ConnectionPool(
        conninfo=_get_database_url(),
        min_size=1,
        max_size=5,
    )
    pool.open()
    return pool

def _bytes_to_pil_image(raw: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise ValueError("Invalid image file.") from exc

def _fetch_image_url_by_id(image_id: UUID) -> str:
    with _get_connection_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT image_url FROM cards WHERE id = %s::uuid",
                (str(image_id),),
            )
            row = cur.fetchone()

    if not row:
        raise LookupError(f"Card with id {image_id} was not found.")

    return row[0]

def _fetch_image_urls_by_ids(image_ids: List[UUID]) -> dict[str, str]:
    ids = [str(i) for i in image_ids]

    with _get_connection_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id::text, image_url FROM cards WHERE id = ANY(%s::uuid[])",
                (ids,),
            )
            rows = cur.fetchall()

    return {row[0]: row[1] for row in rows}

async def _download_image(client: httpx.AsyncClient, image_url: str) -> Image.Image:
    response = await client.get(image_url)
    response.raise_for_status()
    return _bytes_to_pil_image(response.content)