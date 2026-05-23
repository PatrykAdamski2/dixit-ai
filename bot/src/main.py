import asyncio
import base64
import binascii
from typing import List, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator
import httpx

from src.bot import get_narrator, get_matcher
from src.util import (
    _bytes_to_pil_image,
    _fetch_image_url_by_id,
    _fetch_image_urls_by_ids,
    _download_image,
)

load_dotenv()

class GeneratePromptRequest(BaseModel):
    image_id: Optional[UUID] = None
    image_b64: Optional[str] = None

    @model_validator(mode='after')
    def validate(cls, model):
        if bool(model.image_id) == bool(model.image_b64):
            raise ValueError("Provide exactly one of 'image_id' or 'image_b64'.")
        return model

class ChooseCardRequest(BaseModel):
    clue: str = Field(min_length=1)
    image_ids: Optional[List[UUID]] = None
    images_b64: Optional[List[str]] = None

    @model_validator(mode='after')
    def validate(cls, model):
        if bool(model.image_ids) == bool(model.images_b64):
            raise ValueError("Provide exactly one of 'image_ids' or 'images_b64'.")
        return model

class GeneratePromptResponse(BaseModel):
    clue: str

class ChooseCardResponse(BaseModel):
    best_index: int
    probabilities: List[float]

app = FastAPI(title="Dixit Bot API")

@app.post("/generate-prompt/", response_model=GeneratePromptResponse)
async def generate_prompt_default_lang(payload: GeneratePromptRequest) -> GeneratePromptResponse:
    return await generate_prompt("pl", payload)

@app.post("/generate-prompt/{lang}", response_model=GeneratePromptResponse)
async def generate_prompt(lang: str, payload: GeneratePromptRequest) -> GeneratePromptResponse:
    try:
        if payload.image_id:
            image_url = _fetch_image_url_by_id(payload.image_id)
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                pil_image = await _download_image(client, image_url)
        elif payload.image_b64:
            try:
                raw = base64.b64decode(payload.image_b64)
            except (binascii.Error, TypeError) as exc:
                raise HTTPException(status_code=400, detail="Invalid base64 image") from exc
            pil_image = _bytes_to_pil_image(raw)

        clue = get_narrator().generate_clue(pil_image, lang)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download image: {exc}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"clue": clue}

@app.post("/choose-card", response_model=ChooseCardResponse)
async def choose_card(payload: ChooseCardRequest) -> ChooseCardResponse:
    clue = payload.clue.strip()
    if not clue:
        raise HTTPException(status_code=400, detail="clue is required.")

    pil_images: List[Image.Image] = []

    try:
        if payload.image_ids:
            url_map = _fetch_image_urls_by_ids(payload.image_ids)
            missing = [str(i) for i in payload.image_ids if str(i) not in url_map]
            if missing:
                raise HTTPException(
                    status_code=404,
                    detail=f"Cards not found for ids: {', '.join(missing)}",
                )
            ordered_urls = [url_map[str(i)] for i in payload.image_ids]
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                pil_images = await asyncio.gather(
                    *[_download_image(client, u) for u in ordered_urls]
                )
        else:
            for b64 in payload.images_b64:
                try:
                    raw = base64.b64decode(b64)
                except (binascii.Error, TypeError) as exc:
                    raise HTTPException(status_code=400, detail="One of the images is not valid base64") from exc
                pil_images.append(_bytes_to_pil_image(raw))

        best_index, probabilities = get_matcher().choose_best_image(pil_images, clue)
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download one or more images: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to choose card: {exc}") from exc

    return {"best_index": best_index, "probabilities": probabilities}