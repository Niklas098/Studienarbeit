classes: ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
Label counts (min/median/max): 103 463 6034
Split ok. Stratify used: True
Using model: tf_efficientnet_lite2
/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_auth.py:94: UserWarning: 
The secret `HF_TOKEN` does not exist in your Colab secrets.
To authenticate with the Hugging Face Hub, create a token in your settings tab (https://huggingface.co/settings/tokens), set it as secret in your Google Colab and restart your session.
You will be able to reuse this secret in all of your notebooks.
Please note that authentication is recommended but still optional to access public models or datasets.
  warnings.warn(
Model data_config: {'input_size': (3, 260, 260), 'interpolation': 'bicubic', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.89, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.2572 acc 0.428 | val_loss 1.6943 acc 0.590
[Warmup] Epoch 02 | train_loss 1.8928 acc 0.469 | val_loss 1.5007 acc 0.613
[Warmup] Epoch 03 | train_loss 1.7704 acc 0.487 | val_loss 1.4843 acc 0.586

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.6971 acc 0.497 | val_loss 1.3034 acc 0.644
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 02 | train_loss 1.4405 acc 0.541 | val_loss 1.0473 acc 0.669
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 03 | train_loss 1.2817 acc 0.568 | val_loss 0.9970 acc 0.683
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 04 | train_loss 1.1920 acc 0.588 | val_loss 0.9350 acc 0.693
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 05 | train_loss 1.0882 acc 0.612 | val_loss 0.9003 acc 0.752
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 06 | train_loss 1.0361 acc 0.628 | val_loss 0.8427 acc 0.743
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 07 | train_loss 1.0163 acc 0.647 | val_loss 0.7339 acc 0.728
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 08 | train_loss 0.9802 acc 0.658 | val_loss 0.7011 acc 0.739
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 09 | train_loss 0.9572 acc 0.655 | val_loss 0.6636 acc 0.784
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 10 | train_loss 0.8817 acc 0.664 | val_loss 0.6688 acc 0.762
Epoch 11 | train_loss 0.8515 acc 0.678 | val_loss 0.7240 acc 0.741
Epoch 12 | train_loss 0.9169 acc 0.672 | val_loss 0.7288 acc 0.770
Epoch 13 | train_loss 0.8098 acc 0.701 | val_loss 0.6333 acc 0.762
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 14 | train_loss 0.7747 acc 0.713 | val_loss 0.6953 acc 0.813
Epoch 15 | train_loss 0.7373 acc 0.712 | val_loss 0.6155 acc 0.795
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 16 | train_loss 0.7414 acc 0.721 | val_loss 0.6408 acc 0.805
Epoch 17 | train_loss 0.7101 acc 0.723 | val_loss 0.6285 acc 0.800
Epoch 18 | train_loss 0.6964 acc 0.735 | val_loss 0.6423 acc 0.796
Epoch 19 | train_loss 0.6575 acc 0.742 | val_loss 0.5976 acc 0.817
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 20 | train_loss 0.6481 acc 0.745 | val_loss 0.6129 acc 0.819
Epoch 21 | train_loss 0.6495 acc 0.747 | val_loss 0.5969 acc 0.816
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt
Epoch 22 | train_loss 0.6248 acc 0.757 | val_loss 0.6202 acc 0.820
Epoch 23 | train_loss 0.5741 acc 0.757 | val_loss 0.6203 acc 0.818
Epoch 24 | train_loss 0.5554 acc 0.764 | val_loss 0.6643 acc 0.825
Epoch 25 | train_loss 0.5769 acc 0.772 | val_loss 0.6145 acc 0.831

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638

Loaded checkpoint for eval: /content/drive/MyDrive/Lite2_Checkpoints/run_20260301_084638/efficientnet_lite2_best.pt (epoch 21)

===== VALIDATION METRICS (Lite2) =====
Balanced Accuracy : 0.7962
Macro F1          : 0.7029
Weighted F1       : 0.8247

Confusion Matrix:
        akiec  bcc  bkl  df  mel    nv  vasc
akiec     48    1    5   1    4     0     0
bcc        6   77    1   4    3     1     1
bkl       13    5  149   2   21     8     0
df         3    1    2  13    0     1     0
mel        5    4   19   2  137    28     5
nv         9   19   54  10   87  1019     9
vasc       0    0    0   0    0     0    26

Classification Report:
               precision    recall  f1-score   support

       akiec      0.571     0.814     0.671        59
         bcc      0.720     0.828     0.770        93
         bkl      0.648     0.753     0.696       198
          df      0.406     0.650     0.500        20
         mel      0.544     0.685     0.606       200
          nv      0.964     0.844     0.900      1207
        vasc      0.634     1.000     0.776        26

    accuracy                          0.815      1803
   macro avg      0.641     0.796     0.703      1803
weighted avg      0.846     0.815     0.825      1803