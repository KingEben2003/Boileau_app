import fitz  # PyMuPDF
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Document, Summary, Quiz, Question
from . import gemini_client

class GenerateSummaryView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        pdf_file = request.data.get('pdf')
        summary_type = request.data.get('type', 'brief')

        if not pdf_file:
            return Response({"error": "Aucun fichier PDF fourni."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Efficient PDF processing with PyMuPDF
            doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
            text = "".join(page.get_text() for page in doc)
            doc.close()

            if not text.strip():
                return Response({"error": "Le PDF est vide ou ne contient pas de texte extractible."}, status=status.HTTP_400_BAD_REQUEST)

            # Store the document text
            document = Document.objects.create(file_name=pdf_file.name, original_text=text)
            
            # Generate summary
            summary_content = gemini_client.generate_summary_from_text(text, summary_type)

            if not summary_content:
                return Response({"error": "Échec de la génération du résumé par l'API."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Store the summary
            Summary.objects.create(document=document, summary_type=summary_type, content=summary_content)

            return Response({"summary": summary_content, "document_id": document.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Erreur interne du serveur: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateQuizView(APIView):
    def post(self, request, *args, **kwargs):
        document_id = request.data.get('document_id')
        num_questions = request.data.get('numQuestions', 5)
        quiz_type = request.data.get('type', 'QCM')

        if not document_id:
            return Response({"error": "L'ID du document est manquant."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            document = Document.objects.get(pk=document_id)
            quiz_json_str = gemini_client.generate_quiz_from_text(document.original_text, num_questions, quiz_type)

            if not quiz_json_str:
                return Response({"error": "Échec de la génération du quiz par l'API."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            questions_data = json.loads(quiz_json_str)
            
            # Store the quiz and questions
            quiz = Quiz.objects.create(document=document, quiz_type=quiz_type)
            for q_data in questions_data:
                Question.objects.create(
                    quiz=quiz,
                    question_text=q_data.get('question'),
                    options=q_data.get('options', []),
                    answer=q_data.get('answer'),
                    explanation=q_data.get('explanation')
                )

            return Response({"quiz": questions_data, "quiz_id": quiz.id}, status=status.HTTP_201_CREATED)
        except Document.DoesNotExist:
            return Response({"error": "Document non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError:
            return Response({"error": "Réponse invalide (non-JSON) de l'API Gemini."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": f"Erreur interne du serveur: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)