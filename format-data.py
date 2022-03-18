import random
import sys
import json

if len(sys.argv) < 2:
  print("Usage: python train.py <personality_hash>")
  exit(1)

personality_hash = sys.argv[1]
personality_path = "./data/personalities/" + personality_hash + ".json"
personality_data = open(personality_path, "r").read()
personality_json = json.loads(personality_data)

personality_formatted = ""
personality_test = ""

for block in personality_json["messages"]:
  context = ""
  for message in block["context"]:
    context += message["author"] + ">>> " + message["content"] + "\n"
  if random.randint(0, 10) == 0:
    personality_test += context + personality_json["basedOn"]["name"] + "_BOT>>> " + block["content"] + "\n\n"
  else:
    personality_formatted += context + personality_json["basedOn"]["name"] + "_BOT>>> " + block["content"] + "\n\n"

# write to {hash}.txt
with open("./data/personalities/" + personality_hash + ".txt", "w") as f:
  f.write(personality_formatted)

with open("./data/personalities/" + personality_hash + "_test.txt", "w") as f:
  f.write(personality_test)
