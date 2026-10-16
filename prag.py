import streamlit as st
from langchain.document_loaders import TextLoader
from langchain.vectorstores import FAISS
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.llms import Ollama
import os

def load_documents(uploaded_file):
    if uploaded_file is not None:
        text = uploaded_file.getvalue().decode("utf-8")
        return [text]
    return []

def main():
    st.title("RAG with Ollama Llama 3.2 and FAISS")

    # File uploader
    uploaded_file = st.file_uploader("Upload a text file", type=["txt"])
    
    if uploaded_file:
        documents = load_documents(uploaded_file)
        if documents:
            st.success("File uploaded successfully!")

            # Create embeddings and FAISS index
            embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")  # Using Sentence Transformers
            vector_store = FAISS.from_texts(documents, embeddings)

            # User query
            user_query = st.text_input("Ask a question about the document:")
            if user_query:
                # Retrieve relevant documents
                docs = vector_store.similarity_search(user_query)

                # Generate answer using the Llama model
                llm = Ollama(model="llama3.2")
                response = llm(docs[0].page_content + "\n" + user_query)
                
                st.subheader("Response:")
                st.write(response)

if __name__ == "__main__":
    main()