import os
import sys

# Configure Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "APIBoileau.settings")

import django
django.setup()

from documents.services import extract_and_clean_pdf_text
from summaries.services import generate_summary_with_gemini
from quizzes.services import generate_quiz_with_gemini

def main():
    print("Testing Gemini Services Integration...")

    # Create a dummy PDF
    dummy_pdf_path = "dummy_test.pdf"
    try:
        from reportlab.pdfgen import canvas
        c = canvas.Canvas(dummy_pdf_path)
        c.drawString(100, 750, "Ceci est un document de test pour l'extraction de texte et la generation de resume.")
        c.save()
        print("1. Created dummy PDF successfully.")
    except ImportError:
        print("Missing reportlab. Falling back to simple text for dummy PDF.")
        with open("dummy_text.txt", "w", encoding="utf-8") as f:
            f.write("Ceci est un document de test pour l'extraction de texte.")
        dummy_pdf_path = "dummy_text.txt"

    # 1. Test PDF extraction
    try:
        extracted = extract_and_clean_pdf_text(dummy_pdf_path)
        print(f"2. Extracted text length: {len(extracted)}")
        if not extracted:
            print("Extracted text is empty. pypdf might not be installed or the file isn't a PDF.")
            extracted = "Ceci est un document de test pour l'extraction de texte et la generation de resume."
    except Exception as e:
        print(f"Extraction failed: {e}")
        extracted = "Ceci est un document de test pour l'extraction de texte et la generation de resume."

    # 2. Test Summary Generation
    try:
        summary = generate_summary_with_gemini(extracted, "brief")
        print(f"3. Generated Summary: {summary[:100]}...")
    except Exception as e:
        print(f"Summary generation failed: {e}")

    # 3. Test Quiz Generation
    try:
        quiz = generate_quiz_with_gemini(extracted, "qcm", "medium", 2)
        print(f"4. Generated Quiz (Count): {len(quiz)}")
        for i, q in enumerate(quiz, 1):
            print(f" Q{i}: {q['question_text']}")
    except Exception as e:
        print(f"Quiz generation failed: {e}")

if __name__ == "__main__":
    main()
