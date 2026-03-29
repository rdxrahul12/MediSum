from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from pypdf import PdfReader
import io
import os
import json
import re
import time
import urllib.request
from urllib.parse import urlparse
from datetime import datetime

from langchain_community.llms import Ollama
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever, ParentDocumentRetriever, ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.storage import InMemoryStore
import logging
from dotenv import load_dotenv
from langchain_text_splitters import TextSplitter

class SemanticChunkerWrapper(TextSplitter):
    """Wrapper to make SemanticChunker pass Pydantic validation for TextSplitter."""
    def __init__(self, chunker):
        super().__init__(chunk_size=1, chunk_overlap=0) 
        self.chunker = chunker

    def split_text(self, text: str):
        return self.chunker.split_text(text)

    def split_documents(self, documents):
        return self.chunker.split_documents(documents)
import shutil

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'default_secret')
CORS(app) # Enable CORS for all routes



# Initialize Ollama model
# Defaults
# OLLAMA_BASE_URL will be determined dynamically




# Define the prompt templates
medical_prompt_template = """System: You are an expert medical report generator AI. Your task is to create a structured medical report using ONLY the provided Context.
DO NOT repeat or echo these instructions in your output. Start your response directly with the "**Urgency Level:**" header.

<Instructions>
Use this EXACT format:

**Urgency Level:**
[Classify strictly as "Routine", "Urgent", or "Critical" based on the severity of symptoms and diagnosis]

**Patient Details:**
[Extract if available, else omit]

**Timeline of Events:**
- Extract all events in time order (oldest -> latest).
- Include dates if available, otherwise infer the sequence.
- Focus strictly on key events: Symptoms onset, Diagnoses, Tests and reports, Treatments and medications, and Follow-ups.
- Keep the language simple and easy to understand (layman-friendly).

**Medical History:**
- Summary:
  - Relevant past illnesses: [Summarize]
  - Chronic conditions: [List]

**Symptoms and Diagnosis:**
- Symptoms: [Summarize]
- Diagnosis: [Provide diagnosis, making sure to wrap with [[DIAG|name]]]

**Treatment and Recommendations:**
- Treatment: [List medications wrapped with [[MED|name]] and procedures with [[PROC|name]]]
- Recommendations: [Follow-up/Lifestyle]

**Current Status:**
- Status: [Describe condition]

Throughout your output, you MUST wrap Medication names EXACTLY as `[[MED|name]]`, Diagnosis names EXACTLY as `[[DIAG|name]]`, and Procedure names EXACTLY as `[[PROC|name]]`.
</Instructions>

Context:
"{context}"

Assistant:
"""


# Define the prompt template


# Initialize embeddings globally to avoid reloading
try:
    embeddings = HuggingFaceEmbeddings(model_name="NeuML/pubmedbert-base-embeddings")
except Exception as e:
    logging.error(f"Error initializing embeddings: {e}")
    embeddings = None

active_retriever = None

@app.route('/stream_generate', methods=['POST'])
def stream_generate():
    text_input = request.form.get('report_text')
    uploaded_file = request.files.get('file')



    # Handle file upload if present
    if uploaded_file and uploaded_file.filename != '':
        try:
            if uploaded_file.filename.endswith('.pdf'):
                pdf_reader = PdfReader(uploaded_file)
                text_input = ""
                for page in pdf_reader.pages:
                    text_input += page.extract_text() + "\n"
            elif uploaded_file.filename.endswith('.txt'):
                text_input = uploaded_file.read().decode('utf-8')
        except Exception as e:
             return jsonify({'error': f"Error reading file: {e}"})
    
    if not text_input:
        return jsonify({'error': "No text provided"})

    def generate():
        yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] INITIALIZING SYSTEM PROTOCOLS..."}) + "\n"
        time.sleep(0.5)
        
        if not embeddings:
            yield json.dumps({'type': 'error', 'message': "Embeddings model not initialized."}) + "\n"
            return
            
        try:
            global active_retriever
            if active_retriever:
                active_retriever = None

            # Step 1: Document Processing
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] INGESTING DOCUMENT DATASHEET..."}) + "\n"
            documents = [Document(page_content=text_input)]
            time.sleep(0.3)
            
            # Step 2: Semantic Chunking & Parent Documents
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] PARTITIONING DATA STREAMS (SEMANTIC CHUNKING)..."}) + "\n"
            parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
            child_splitter = SemanticChunkerWrapper(SemanticChunker(embeddings))
            store = InMemoryStore()
            
            vectorstore = Chroma(
                collection_name="temp_collection",
                embedding_function=embeddings
            )
            
            parent_retriever = ParentDocumentRetriever(
                vectorstore=vectorstore,
                docstore=store,
                child_splitter=child_splitter,
                parent_splitter=parent_splitter
            )
            
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] GENERATING VECTOR EMBEDDINGS (HuggingFace)..."}) + "\n"
            parent_retriever.add_documents(documents)
            time.sleep(0.5)

            # Step 3: Hybrid Search Setup
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] INITIALIZING BM25 HYBRID SEARCH ENSEMBLE..."}) + "\n"
            bm25_docs = parent_splitter.split_documents(documents)
            bm25_retriever = BM25Retriever.from_documents(bm25_docs)
            bm25_retriever.k = 3
            
            ensemble_retriever = EnsembleRetriever(
                retrievers=[bm25_retriever, parent_retriever], weights=[0.5, 0.5]
            )

            # Step 3.5: Post-Retrieval Re-ranking
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] PREPARING MEDCPT RE-RANKER..."}) + "\n"
            cross_encoder = HuggingFaceCrossEncoder(model_name="ncbi/MedCPT-Cross-Encoder")
            compressor = CrossEncoderReranker(model=cross_encoder, top_n=3)
            active_retriever = ContextualCompressionRetriever(
                base_compressor=compressor, base_retriever=ensemble_retriever
            )
            time.sleep(0.5)

            # Step 4: Model Connection
            model_name = "qwen2.5:3b"
            
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] CONNECTING TO LOCAL OLLAMA NODE (127.0.0.1)..."}) + "\n"
            
            selected_url = os.getenv('OLLAMA_BASE_URL', "http://127.0.0.1:11434")
            
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] ESTABLISHING SECURE UPLINK..."}) + "\n"
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] MODEL SELECTED: {model_name}"}) + "\n"
            
            llm = Ollama(
                base_url=selected_url,
                model=model_name
            )


            prompt = PromptTemplate(
                template=medical_prompt_template,
                input_variables=["context"]
            )

            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                retriever=active_retriever,
                chain_type="stuff",
                chain_type_kwargs={"prompt": prompt},
                return_source_documents=False
            )

            # Step 5: Inference
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] RUNNING INFERENCE SEQUENCE..."}) + "\n"
            response = qa_chain.invoke("Create a full medical summary")
            
            result_text = response.get("result", "")
            
            # Extract Urgency Level
            urgency_match = re.search(r'\*\*Urgency Level:\*\*\s*(Routine|Urgent|Critical)', result_text, re.IGNORECASE)
            urgency_level = urgency_match.group(1).capitalize() if urgency_match else "Routine"
            
            # Cleanup
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] SAVING CONTEXT FOR CHAT SESSION..."}) + "\n"
            
            # Final Result
            yield json.dumps({'type': 'result', 'content': result_text, 'urgency': urgency_level}) + "\n"
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] TASK COMPLETED SUCCESSFULLY."}) + "\n"

        except Exception as e:
            logging.error(f"Error generating summary: {e}")
            yield json.dumps({'type': 'error', 'message': f"CRITICAL FAILURE: {str(e)}"}) + "\n"

    return Response(stream_with_context(generate()), mimetype='application/json')

chat_prompt_template = """System: You are a medical AI assistant. Answer the user's medical question using ONLY the provided Context.
If the answer is not in the context, say "I don't have enough information from the report to answer that."

<Instructions>
**Important Formatting Rules for Named Entities:**
Throughout your response, wrap all Medication names EXACTLY as `[[MED|name]]`, Diagnosis names EXACTLY as `[[DIAG|name]]`, and Procedure names EXACTLY as `[[PROC|name]]`.

Include a clear medical disclaimer at the very end of your response stating that you are an AI, this tool may make mistakes, and the user must consult a qualified doctor for final advice.
</Instructions>

Context: 
{context}

User: 
{question}

Assistant:
"""

@app.route('/stream_chat', methods=['POST'])
def stream_chat():
    global active_retriever
    
    data = request.json
    question = data.get('question')
    history = data.get('history', [])
    
    def generate():
        if not active_retriever:
            yield json.dumps({'type': 'error', 'message': "No medical report loaded. Please configure the summary protocol first."}) + "\n"
            return
            
        try:
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] ANALYZING DOCUMENT CONTEXT..."}) + "\n"
            
            model_name = "qwen2.5:3b"
            selected_url = os.getenv('OLLAMA_BASE_URL', "http://127.0.0.1:11434")
            llm = Ollama(base_url=selected_url, model=model_name)
            
            formatted_history = ""
            for msg in history:
                role = "Human" if msg['role'] == 'user' else "AI"
                formatted_history += f"{role}: {msg['content']}\n"
                
            prompt = PromptTemplate(
                template=chat_prompt_template,
                input_variables=["context", "question"]
            )
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                retriever=active_retriever,
                chain_type="stuff",
                chain_type_kwargs={"prompt": prompt},
            )
            
            custom_question = ""
            if formatted_history:
                custom_question = f"Previous Conversation History:\n{formatted_history}\n\n"
            custom_question += f"{question}"
            
            response = qa_chain.invoke(custom_question)
            result_text = response.get("result", "")
            
            if "disclaimer" not in result_text.lower() and "consult a" not in result_text.lower():
                result_text += "\n\n**Disclaimer:** I am an AI medical assistant. This tool may make mistakes. Always consult a qualified medical professional for final advice."
            
            yield json.dumps({'type': 'result', 'content': result_text}) + "\n"
            
        except Exception as e:
            logging.error(f"Error generating chat: {e}")
            yield json.dumps({'type': 'error', 'message': f"CRITICAL FAILURE: {str(e)}"}) + "\n"

    return Response(stream_with_context(generate()), mimetype='application/json')

translate_prompt_template = """
You are a helpful medical translator. Explain the following medical term in 2 or 3 sentences max, using extremely simple Layman's terms that a 10-year-old could understand. Don't use complex medical jargon.

Medical Term to Explain: {term}
"""

@app.route('/explain_term', methods=['POST'])
def explain_term():
    data = request.json
    term = data.get('term')
    
    if not term:
        return jsonify({'error': "No term provided"}), 400
        
    def generate():
        try:
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] TRANSLATING JARGON: {term}..."}) + "\n"
            
            model_name = "qwen2.5:3b"
            selected_url = os.getenv('OLLAMA_BASE_URL', "http://127.0.0.1:11434")
            llm = Ollama(base_url=selected_url, model=model_name)
            
            formatted_prompt = translate_prompt_template.format(term=term)
            result_text = llm.invoke(formatted_prompt)
            
            yield json.dumps({'type': 'result', 'content': result_text}) + "\n"
        except Exception as e:
            logging.error(f"Error explaining term: {e}")
            yield json.dumps({'type': 'error', 'message': f"Failed to translate: {str(e)}"}) + "\n"

    return Response(stream_with_context(generate()), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5000)