from pathlib import Path

from unstructured.partition.auto import partition
from unstructured.partition.pdf import partition_pdf


def parse_document(file_path: Path) -> str:
    if file_path.suffix.lower() == ".pdf":
        elements = partition_pdf(filename=str(file_path), strategy="fast")
    else:
        elements = partition(filename=str(file_path))

    content = "\n\n".join(str(element).strip() for element in elements if str(element).strip())
    return content.strip()
