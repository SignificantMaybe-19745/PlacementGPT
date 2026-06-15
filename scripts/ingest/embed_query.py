from fastembed import TextEmbedding
import sys
import json

model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

text = sys.stdin.read().strip()

embedding = next(model.embed([text]))

print(json.dumps(embedding.tolist()))