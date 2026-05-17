FROM node:20-slim AS builder
WORKDIR /app/react-ui
COPY react-ui/package*.json ./
COPY react-ui/ .
RUN npm install
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
COPY --from=builder /app/react-ui/dist react-ui/dist

EXPOSE 5000
ENV PYTHONUNBUFFERED=1
CMD ["python", "app.py"]
