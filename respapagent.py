import sys
import subprocess
from PyQt6.QtWidgets import QApplication, QMainWindow, QTextEdit, QPushButton, QVBoxLayout, QWidget, QComboBox, QLabel, QHBoxLayout
import ollama
import sqlite3
import fitz  # PyMuPDF for PDF export
import requests
import json

class ResearchAI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.initDatabase()

    def initUI(self):
        self.setWindowTitle('AI Research Paper Assistant')
        self.setGeometry(100, 100, 1000, 700)

        # Label for research topic selection
        self.topic_label = QLabel("Select Research Topic:")
        
        # Dropdown for selecting research topics
        self.topic_dropdown = QComboBox(self)
        self.topic_dropdown.addItems(["AI Advancements", "Deep Learning", "Natural Language Processing", "Computer Vision"])

        # Text area for research paper generation
        self.text_area = QTextEdit(self)
        self.text_area.setPlaceholderText("Generated research paper will appear here...")
        self.text_area.setStyleSheet("font-size: 14px; padding: 5px;")

        # Buttons with improved layout and styling
        self.generate_button = QPushButton('Generate Research Paper', self)
        self.generate_button.clicked.connect(self.generate_research_paper)
        self.generate_button.setStyleSheet("font-size: 14px; padding: 8px;")
        
        self.save_button = QPushButton('Save as PDF', self)
        self.save_button.clicked.connect(self.save_as_pdf)
        self.save_button.setStyleSheet("font-size: 14px; padding: 8px;")
        
        self.plagiarism_button = QPushButton('Check Plagiarism', self)
        self.plagiarism_button.clicked.connect(self.check_plagiarism)
        self.plagiarism_button.setStyleSheet("font-size: 14px; padding: 8px;")
        
        self.citation_button = QPushButton('Generate Citations', self)
        self.citation_button.clicked.connect(self.generate_citations)
        self.citation_button.setStyleSheet("font-size: 14px; padding: 8px;")

        # Layout setup
        top_layout = QHBoxLayout()
        top_layout.addWidget(self.topic_label)
        top_layout.addWidget(self.topic_dropdown)

        button_layout = QHBoxLayout()
        button_layout.addWidget(self.generate_button)
        button_layout.addWidget(self.save_button)
        button_layout.addWidget(self.plagiarism_button)
        button_layout.addWidget(self.citation_button)

        main_layout = QVBoxLayout()
        main_layout.addLayout(top_layout)
        main_layout.addWidget(self.text_area)
        main_layout.addLayout(button_layout)

        container = QWidget()
        container.setLayout(main_layout)
        self.setCentralWidget(container)

    def initDatabase(self):
        self.conn = sqlite3.connect("research_papers.db")
        self.cursor = self.conn.cursor()
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT,
                content TEXT
            )
        """)
        self.conn.commit()

    def generate_research_paper(self):
        topic = self.topic_dropdown.currentText()
        prompt = f"Generate a structured research paper on {topic}. Include an Abstract, Introduction, Methodology, Results, and Conclusion."
        response = ollama.chat(model='llama3', messages=[{"role": "user", "content": prompt}])
        
        generated_text = response['message']['content']
        self.text_area.setText(generated_text)

        # Save to database
        self.cursor.execute("INSERT INTO papers (topic, content) VALUES (?, ?)", (topic, generated_text))
        self.conn.commit()

    def save_as_pdf(self):
        text = self.text_area.toPlainText()
        if not text:
            return

        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), text)
        doc.save("research_paper.pdf")
        doc.close()
        print("PDF Saved as research_paper.pdf")
    
    def check_plagiarism(self):
        text = self.text_area.toPlainText()
        if not text:
            return
        
        # Placeholder for plagiarism checking (API integration required)
        plagiarism_api_url = "https://api.example.com/check_plagiarism"  # Replace with actual API
        response = requests.post(plagiarism_api_url, json={"text": text})
        
        if response.status_code == 200:
            plagiarism_result = response.json()
            print("Plagiarism Score:", plagiarism_result.get("score", "Unknown"))
        else:
            print("Plagiarism check failed.")
    
    def generate_citations(self):
        text = self.text_area.toPlainText()
        if not text:
            return
        
        zotero_api_url = "https://api.zotero.org/citations"  # Replace with actual Zotero API endpoint
        headers = {"Content-Type": "application/json"}
        response = requests.post(zotero_api_url, headers=headers, json={"text": text})
        
        if response.status_code == 200:
            citation_result = response.json()
            citations = citation_result.get("citations", "No citations found.")
            self.text_area.append("\n\nCitations:\n" + json.dumps(citations, indent=2))
        else:
            print("Citation generation failed.")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = ResearchAI()
    window.show()
    sys.exit(app.exec())
