from fastembed import TextEmbedding

model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

embeddings = list(model.embed(["Design an LRU Cache"]))

print(len(embeddings[0]))