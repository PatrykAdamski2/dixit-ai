from pathlib import Path
from huggingface_hub import hf_hub_download

MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FILENAME = "open_clip_pytorch_model.bin"
TARGET = MODEL_DIR / FILENAME

def main() -> None:
    if TARGET.exists() and TARGET.stat().st_size > 0:
        print(f"Model already exists at: {TARGET}")
        return

    repo_id = "laion/CLIP-ViT-B-32-laion2B-s34B-b79K"

    downloaded_path = hf_hub_download(
        repo_id=repo_id,
        filename=FILENAME,
        local_dir=str(MODEL_DIR),
    )

    print(f"Downloaded to: {downloaded_path}")
    print(f"Expected model path: {TARGET}")

if __name__ == "__main__":
    main()