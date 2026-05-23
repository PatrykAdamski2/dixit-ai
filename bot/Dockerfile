FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

# Copy pyproject.toml and install Python dependencies
COPY . .
RUN uv sync

# Run setup.py to download the model
RUN uv run src/setup.py

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]