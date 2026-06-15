import os
from dotenv import load_dotenv
import psycopg2
from pgvector.psycopg2 import register_vector

from embeddings import generate_embedding

load_dotenv()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
register_vector(conn)

cur = conn.cursor()

cur.execute("""
    SELECT id, content
    FROM "Resource"
    WHERE embedding IS NULL
""")

rows = cur.fetchall()

print(f"Found {len(rows)} resources to backfill.")

for resource_id, content in rows:
    print(f"Embedding {resource_id}...")

    embedding = generate_embedding(content)

    cur.execute(
        """
        UPDATE "Resource"
        SET embedding = %s
        WHERE id = %s
        """,
        (embedding, resource_id),
    )

    conn.commit()

print("Done!")

cur.close()
conn.close()