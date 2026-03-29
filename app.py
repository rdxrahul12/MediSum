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
import logging
from dotenv import load_dotenv
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
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
except Exception as e:
    logging.error(f"Error initializing embeddings: {e}")
    embeddings = None

active_vectordb = None

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
            global active_vectordb
            if active_vectordb:
                try:
                    active_vectordb.delete_collection()
                except:
                    pass

            # Step 1: Document Processing
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] INGESTING DOCUMENT DATASHEET..."}) + "\n"
            documents = [Document(page_content=text_input)]
            time.sleep(0.3)
            
            # Step 2: Splitting
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] PARTITIONING DATA STREAMS (CHUNK_SIZE=1500)..."}) + "\n"
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)
            split_docs = text_splitter.split_documents(documents)
            time.sleep(0.3)

            # Step 3: Embedding
            yield json.dumps({'type': 'log', 'message': f"[{datetime.now().strftime('%H:%M:%S')}] GENERATING VECTOR EMBEDDINGS (HuggingFace)..."}) + "\n"
            active_vectordb = Chroma.from_documents(
                documents=split_docs,
                embedding=embeddings,
                collection_name="temp_collection" # use a unique name or default
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
                retriever=active_vectordb.as_retriever(),
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
    global active_vectordb
    
    data = request.json
    question = data.get('question')
    history = data.get('history', [])
    
    def generate():
        if not active_vectordb:
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
                retriever=active_vectordb.as_retriever(),
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