import time
import tracemalloc


class Profiler:
    def __init__(self):
        self.start = None
        self.end = None
        self.peak = 0

    def __enter__(self):
        tracemalloc.start()
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.end = time.perf_counter()
        current, peak = tracemalloc.get_traced_memory()
        self.peak = peak
        tracemalloc.stop()

    @property
    def elapsed(self):
        return (self.end - self.start) if (self.end and self.start) else None
