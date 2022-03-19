from transformers import pipeline

models = {}

from flask import Flask, request, Response

app = Flask(__name__)

@app.route("/<personality_hash>", methods=['POST'])
def generate(personality_hash):
  context = request.form['context']

  if len(context) <= 0:
    return Response(status=400)
  print(personality_hash, models)

  if personality_hash not in models:
    return Response(status=404)

  m = models[personality_hash]

  res = m(context, max_length=100, do_sample=True)[0]["generated_text"]

  return res

@app.route("/<personality_hash>", methods=['PUT'])
def put_model(personality_hash):
  m = pipeline('text-generation',model='./'+personality_hash, tokenizer='microsoft/DialoGPT-medium')
  models[personality_hash] = m
  return Response(status=200)
