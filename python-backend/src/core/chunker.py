def chunk_text(content: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    normalized = content.strip()

    if not normalized:
        return []

    chunks: list[str] = []
    start = 0

    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunks.append(normalized[start:end].strip())

        if end >= len(normalized):
            break

        start = max(0, end - overlap)

    return [chunk for chunk in chunks if chunk]
