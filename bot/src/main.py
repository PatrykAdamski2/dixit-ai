import io
from typing import Any, List
from pathlib import Path
import sys
import google.genai as genai
import open_clip
import torch
from PIL import Image

model_file = Path(__file__).resolve().parent.parent / "model" / "open_clip_pytorch_model.bin"
if not model_file.exists() or model_file.stat().st_size == 0:
    print(f"Model not found at: {model_file}")
    print("Please run: python3 bot/src/setup.py to download the model before starting the bot.", flush=True)
    sys.exit(1)


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
            "ViT-B-32", pretrained="./model/open_clip_pytorch_model.bin"
        )
        self.model : Any = model.eval().to(self.device)
        self.preprocess : Any = preprocess
        self.tokenizer = open_clip.get_tokenizer("ViT-B-32")

    def choose_best_image(self, images: List[Image.Image], clue: str) -> List[float]:
        image_tensors = [self.preprocess(img).unsqueeze(0) for img in images]
        image_batch = torch.cat(image_tensors).to(self.device)
        text_tokens = self.tokenizer([clue]).to(self.device)

        with torch.no_grad():
            image_features = self.model.encode_image(image_batch)
            text_features = self.model.encode_text(text_tokens)

            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)

            probs = (100.0 * image_features @ text_features.T).softmax(dim=0).T
        
        return probs
    