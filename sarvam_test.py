import os
import sys

from sarvamai import SarvamAI

# Read the key from the environment, falling back to .env. Never printed.
k = os.environ.get("SARVAM_API_KEY", "")
if not k and os.path.exists(".env"):
    for ln in open(".env"):
        if ln.startswith("SARVAM_API_KEY="):
            k = ln.split("=", 1)[1].strip()

if not k:
    sys.exit("SARVAM_API_KEY is empty. Paste your key into .env and run again.")

c = SarvamAI(api_subscription_key=k)
r = c.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Say hello in Hindi in one short sentence."}],
    max_tokens=600,
)
print(r.choices[0].message.content)
