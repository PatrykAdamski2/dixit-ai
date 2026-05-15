from functools import lru_cache
import io
import os
from typing import Any, List, Tuple
from pathlib import Path
import sys
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
import google.genai as genai
import open_clip
import torch
from PIL import Image
import asyncio
from uuid import UUID
import httpx
import psycopg
from pydantic import BaseModel, Field
import base64
import binascii

MODEL_FILE = Path(__file__).resolve().parent.parent / "model" / "open_clip_pytorch_model.bin"
if not MODEL_FILE.exists() or MODEL_FILE.stat().st_size == 0:
    print(f"Model not found at: {MODEL_FILE}")
    print("Please run: python3 bot/src/setup.py to download the model before starting the bot.", flush=True)
    sys.exit(1)

load_dotenv()


class GeminiNarrator:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

    def generate_clue(self, image: Image.Image) -> str:
        prompt = (
            "You are a Dixit narrator. Create one short, poetic clue (3-8 words) "
            "for this image. Keep it imaginative and indirect, not literal. "
            "Return only the clue text."
        )

        image_bytes_buffer = io.BytesIO()
        image.convert("RGB").save(image_bytes_buffer, format="PNG")

        response = self._client.models.generate_content(
            model=self._model_name,
            contents=[
                genai.types.Part.from_bytes(
                    data=image_bytes_buffer.getvalue(),
                    mime_type="image/png",
                ),
                prompt
            ]
        )
        
        if not response.text:
            raise RuntimeError("Gemini returned an empty clue.")
        return response.text


class OpenClipMatcher:
    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        model, _, preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained=str(MODEL_FILE)
        )
        self.model : Any = model.eval().to(self.device)
        self.preprocess : Any = preprocess
        self.tokenizer = open_clip.get_tokenizer("ViT-B-32")

    def choose_best_image(self, images: List[Image.Image], clue: str) -> Tuple[int, List[float]]:
        if not images:
            raise ValueError("At least one image is required")
        
        image_tensors = [self.preprocess(img).unsqueeze(0) for img in images]
        image_batch = torch.cat(image_tensors).to(self.device)
        text_tokens = self.tokenizer([clue]).to(self.device)

        with torch.no_grad():
            image_features = self.model.encode_image(image_batch)
            text_features = self.model.encode_text(text_tokens)

            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)

            probs_tensor = (100.0 * image_features @ text_features.T).softmax(dim=0).T
        
        probabilities = probs_tensor.squeeze(0).detach().cpu().tolist()
        best_index = probs_tensor.argmax().item()
        return best_index, probabilities
    
def _bytes_to_pil_image(raw: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise ValueError("Invalid image file.") from exc

@lru_cache(maxsize=1)
def get_narrator() -> GeminiNarrator:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    return GeminiNarrator(api_key=api_key)


@lru_cache(maxsize=1)
def get_matcher() -> OpenClipMatcher:
    return OpenClipMatcher()

app = FastAPI(title="Dixit Bot API")

@app.post("/generate-prompt")
async def generate_prompt(image: UploadFile = File(...)) -> dict:
    raw = await image.read()
    try:
        pil_image = _bytes_to_pil_image(raw)
        clue = get_narrator().generate_clue(pil_image)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"clue": clue}

@app.post("/choose-card")
async def choose_card(
    clue: str = Form(...),
    images: List[UploadFile] = File(...),
) -> dict:
    if not clue.strip():
        raise HTTPException(status_code=400, detail="clue is required.")
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required.")

    try:
        pil_images = [_bytes_to_pil_image(await img.read()) for img in images]
        best_index, probabilities = get_matcher().choose_best_image(pil_images, clue.strip())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to choose card: {exc}") from exc

    return {
        "best_index": best_index,
        "probabilities": probabilities,
    }

# bot/src/main.py - add request models
class GeneratePromptByIdRequest(BaseModel):
    image_id: UUID


class ChooseCardByIdsRequest(BaseModel):
    clue: str = Field(min_length=1)
    image_ids: List[UUID] = Field(min_length=1)

def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")
    return database_url

def _fetch_image_url_by_id(image_id: UUID) -> str:
    with psycopg.connect(_get_database_url()) as conn:
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

    with psycopg.connect(_get_database_url()) as conn:
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

@app.post("/generate-prompt-by-id")
async def generate_prompt_by_id(payload: GeneratePromptByIdRequest) -> dict:
    try:
        image_url = _fetch_image_url_by_id(payload.image_id)

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            pil_image = await _download_image(client, image_url)

        clue = get_narrator().generate_clue(pil_image)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download image: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"clue": clue}

@app.post("/choose-card-by-ids")
async def choose_card_by_ids(payload: ChooseCardByIdsRequest) -> dict:
    clue = payload.clue.strip()
    if not clue:
        raise HTTPException(status_code=400, detail="clue is required.")

    try:
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

        best_index, probabilities = get_matcher().choose_best_image(pil_images, clue)
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download one or more images: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to choose card: {exc}") from exc

    return {
        "best_index": best_index,
        "probabilities": probabilities,
    }

