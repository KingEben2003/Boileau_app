from django.db import models

class Document(models.Model):
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    original_text = models.TextField()

    def __str__(self):
        return self.file_name or f"Document {self.id}"

class Summary(models.Model):
    document = models.ForeignKey(Document, related_name='summaries', on_delete=models.CASCADE)
    summary_type = models.CharField(max_length=50)  # 'brief', 'medium', 'detailed'
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Summary for {self.document.id} ({self.summary_type})"

class Quiz(models.Model):
    document = models.ForeignKey(Document, related_name='quizzes', on_delete=models.CASCADE)
    quiz_type = models.CharField(max_length=50)  # 'QCM', 'ouverte'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz for {self.document.id}"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    options = models.JSONField(null=True, blank=True)  # Pour les QCM
    answer = models.TextField()
    explanation = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.question_text[:80]