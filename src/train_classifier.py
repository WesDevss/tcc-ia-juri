"""
Fase 1: Pipeline de Treinamento (Fine-tuning)
Script para fine-tuning do BERTimbau para classificação binária de jurisprudências
"""

import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score,
    confusion_matrix
)
import matplotlib.pyplot as plt
import seaborn as sns
import os
from tqdm import tqdm


class JurisprudenceDataset(Dataset):
    """Dataset personalizado para jurisprudências"""
    
    def __init__(self, texts, labels, tokenizer, max_length=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
        
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


def compute_metrics(eval_pred):
    """Calcula métricas de avaliação"""
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    
    accuracy = accuracy_score(labels, predictions)
    precision = precision_score(labels, predictions, average='binary')
    recall = recall_score(labels, predictions, average='binary')
    f1 = f1_score(labels, predictions, average='binary')
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1
    }


def load_and_preprocess_data(csv_path, test_size=0.2, val_size=0.1, random_state=42):
    """Carrega e pré-processa o dataset"""
    print("Carregando dataset...")
    df = pd.read_csv(csv_path)
    
    print(f"Dataset carregado: {len(df)} amostras")
    print(f"Distribuição de classes:\n{df['label'].value_counts()}")
    
    # Divisão treino/teste
    X_train, X_test, y_train, y_test = train_test_split(
        df['texto'].values,
        df['label'].values,
        test_size=test_size,
        random_state=random_state,
        stratify=df['label'].values
    )
    
    # Divisão treino/validação
    X_train, X_val, y_train, y_val = train_test_split(
        X_train,
        y_train,
        test_size=val_size,
        random_state=random_state,
        stratify=y_train
    )
    
    print(f"\nDivisão do dataset:")
    print(f"Treino: {len(X_train)} amostras")
    print(f"Validação: {len(X_val)} amostras")
    print(f"Teste: {len(X_test)} amostras")
    
    return X_train, X_val, X_test, y_train, y_val, y_test


def train_model(
    model_name="neuralmind/bert-base-portuguese-cased",
    data_path="../data/dataset_exemplo.csv",
    output_dir="../models/bertimbau-classifier",
    max_length=512,
    batch_size=8,
    num_epochs=5,
    learning_rate=2e-5,
    use_cuda=True
):
    """Pipeline completo de treinamento"""
    
    # Configurar dispositivo
    device = torch.device('cuda' if torch.cuda.is_available() and use_cuda else 'cpu')
    print(f"\nDispositivo: {device}")
    
    # Carregar e pré-processar dados
    X_train, X_val, X_test, y_train, y_val, y_test = load_and_preprocess_data(data_path)
    
    # Carregar tokenizer
    print(f"\nCarregando tokenizer: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Criar datasets
    train_dataset = JurisprudenceDataset(X_train, y_train, tokenizer, max_length)
    val_dataset = JurisprudenceDataset(X_val, y_val, tokenizer, max_length)
    test_dataset = JurisprudenceDataset(X_test, y_test, tokenizer, max_length)
    
    # Carregar modelo
    print(f"Carregando modelo: {model_name}")
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=2
    )
    
    # Configurar argumentos de treinamento
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir=f"{output_dir}/logs",
        logging_steps=10,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        learning_rate=learning_rate,
        fp16=torch.cuda.is_available() and use_cuda,
        dataloader_num_workers=0,
        report_to="none"
    )
    
    # Criar trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )
    
    # Treinar modelo
    print("\nIniciando treinamento...")
    trainer.train()
    
    # Avaliar no conjunto de teste
    print("\nAvaliando no conjunto de teste...")
    test_results = trainer.evaluate(test_dataset)
    print(f"\nResultados no conjunto de teste:")
    for key, value in test_results.items():
        print(f"{key}: {value:.4f}")
    
    # Gerar matriz de confusão
    predictions = trainer.predict(test_dataset)
    y_pred = np.argmax(predictions.predictions, axis=1)
    
    cm = confusion_matrix(y_test, y_pred)
    
    # Plotar matriz de confusão
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Alucinada', 'Real'],
                yticklabels=['Alucinada', 'Real'])
    plt.title('Matriz de Confusão')
    plt.ylabel('Verdadeiro')
    plt.xlabel('Predito')
    plt.tight_layout()
    
    # Salvar matriz de confusão
    os.makedirs("../logs", exist_ok=True)
    plt.savefig("../logs/confusion_matrix.png", dpi=300, bbox_inches='tight')
    print("\nMatriz de confusão salva em ../logs/confusion_matrix.png")
    
    # Salvar modelo final
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"\nModelo salvo em: {output_dir}")
    
    return trainer, test_results


if __name__ == "__main__":
    # Executar treinamento
    trainer, results = train_model(
        model_name="neuralmind/bert-base-portuguese-cased",
        data_path="../data/dataset_exemplo.csv",
        output_dir="../models/bertimbau-classifier",
        max_length=512,
        batch_size=8,
        num_epochs=5,
        learning_rate=2e-5,
        use_cuda=True
    )
    
    print("\nTreinamento concluído com sucesso!")
