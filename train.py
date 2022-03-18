from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling, TextDataset, Trainer, TrainingArguments
import sys

if len(sys.argv) < 2:
  print("Usage: python train.py <personality_hash>")
  exit(1)

personality_hash = sys.argv[1]

tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")

def load_dataset(train_path,test_path,tokenizer):
    train_dataset = TextDataset(
          tokenizer=tokenizer,
          file_path=train_path,
          block_size=128)
     
    test_dataset = TextDataset(
          tokenizer=tokenizer,
          file_path=test_path,
          block_size=128)   
    
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer, mlm=False,
    )
    return train_dataset,test_dataset,data_collator

train_path = './data/personalities/' + personality_hash + '.txt'
test_path = './data/personalities/' + personality_hash + '_test.txt'

train_dataset,test_dataset,data_collator = load_dataset(train_path,test_path,tokenizer)

training_args = TrainingArguments(
  output_dir="./"+personality_hash, #The output directory
  overwrite_output_dir=True, #overwrite the content of the output directory
  num_train_epochs=3, # number of training epochs
  per_device_train_batch_size=32, # batch size for training
  per_device_eval_batch_size=64,  # batch size for evaluation
  eval_steps = 400, # Number of update steps between two evaluations.
  save_steps=800, # after # steps model is saved 
  warmup_steps=500,# number of warmup steps for learning rate scheduler
  prediction_loss_only=True,
)


trainer = Trainer(
  model=model,
  args=training_args,
  data_collator=data_collator,
  train_dataset=train_dataset,
  eval_dataset=test_dataset,
)

trainer.train()
trainer.save_model()