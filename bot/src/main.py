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