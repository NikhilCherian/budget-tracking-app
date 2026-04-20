"""
Generic bank PDF parser using pdfplumber.

Works with text-based PDFs (not scanned images). Tries table extraction
first, falls back to line-by-line regex parsing for common statement formats.
"""

import io
import re
from datetime import date, datetime
from typing import Optional

import pdfplumber


_DATE_PATTERNS = [
    r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",  # 01/02/2024 or 1-2-24
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})\b",
]

_AMOUNT_PATTERN = re.compile(
    r"(?:£|\$|€|USD|GBP|EUR)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)"
)


def _parse_date(raw: str) -> Optional[date]:
    raw = raw.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
        "%m/%d/%Y", "%m-%d-%Y",
        "%d %b %Y", "%d %B %Y",
        "%d %b %y", "%d %B %y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _parse_amount(raw: str) -> Optional[float]:
    raw = raw.replace(",", "").strip()
    m = _AMOUNT_PATTERN.search(raw)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    try:
        return float(raw)
    except ValueError:
        return None


def _row_to_transaction(row: list) -> Optional[dict]:
    """Try to pull date, description, and amount from a table row."""
    if not row or len(row) < 2:
        return None

    cells = [str(c).strip() if c else "" for c in row]

    parsed_date = None
    amount = None
    description_parts = []

    for cell in cells:
        if not parsed_date:
            for pat in _DATE_PATTERNS:
                m = re.search(pat, cell, re.IGNORECASE)
                if m:
                    parsed_date = _parse_date(m.group(1))
                    break

        if amount is None and re.search(r"\d+\.\d{2}", cell):
            candidate = _parse_amount(cell)
            if candidate and candidate > 0:
                amount = candidate
                continue

        if cell and not re.fullmatch(r"[\d,\.£$€%\-\+\s]*", cell):
            description_parts.append(cell)

    if not parsed_date or not amount:
        return None

    description = " ".join(description_parts).strip() or "Imported transaction"
    return {
        "date": parsed_date.isoformat(),
        "description": description[:200],
        "amount": amount,
        "source": "pdf_import",
    }


def parse_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extract transactions from a bank statement PDF.
    Returns a list of dicts with keys: date, description, amount, source.
    """
    transactions = []
    seen = set()

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            # --- Table extraction (preferred) ---
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    tx = _row_to_transaction(row)
                    if tx:
                        key = (tx["date"], tx["description"], tx["amount"])
                        if key not in seen:
                            seen.add(key)
                            transactions.append(tx)

            # --- Text fallback ---
            if not tables:
                text = page.extract_text() or ""
                for line in text.splitlines():
                    tx = _row_to_transaction(line.split())
                    if tx:
                        key = (tx["date"], tx["description"], tx["amount"])
                        if key not in seen:
                            seen.add(key)
                            transactions.append(tx)

    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions
