from fastembed import TextEmbedding

# Load the model once
model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

def generate_embedding(text: str):
    embedding = next(model.embed([text]))
    return embedding.tolist()