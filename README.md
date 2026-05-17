# SudokuSolver

A Sudoku solver and visualization app with a Python backend for puzzle generation and solving.

## Run locally

1. Create a Python virtual environment:
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Start the app:
   ```powershell
   python app.py
   ```
4. Open this URL in your browser:
   ```text
   http://127.0.0.1:5000
   ```

## Deploy with Docker

This project is packaged to deploy as a container:

1. Build the Docker image from the repository root:
   ```powershell
   docker build -t sudoku-solver .
   ```
2. Run the container:
   ```powershell
   docker run --rm -p 5000:5000 sudoku-solver
   ```
3. Open the app in your browser:
   ```text
   http://127.0.0.1:5000
   ```

If you want to run in development mode, set the environment variable before starting:

```powershell
$env:FLASK_DEBUG = '1'
python app.py
```

## Features

- Backend puzzle generation via Python
- Backend-backed instant solve endpoint
- Responsive mobile-friendly UI
- Modern dark theme and better layout for smaller screens
