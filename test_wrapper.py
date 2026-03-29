from langchain.retrievers import ParentDocumentRetriever
from langchain_text_splitters import TextSplitter, RecursiveCharacterTextSplitter
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.storage import InMemoryStore

class W(TextSplitter):
    def __init__(self, c):
        super().__init__(chunk_size=1, chunk_overlap=0)
        self.c = c
    def split_text(self, t):
        return self.c.split_text(t)
    def split_documents(self, d):
        return self.c.split_documents(d)

embeddings = HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')
vectorstore = Chroma(embedding_function=embeddings)
store = InMemoryStore()
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=W(SemanticChunker(embeddings)),
    parent_splitter=parent_splitter
)
print('SUCCESS')
