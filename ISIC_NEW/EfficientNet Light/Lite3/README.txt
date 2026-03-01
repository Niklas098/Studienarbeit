Model data_config: {'input_size': (3, 380, 380), 'interpolation': 'bilinear', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.92, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.0524 acc 0.417 | val_loss 1.5270 acc 0.634
[Warmup] Epoch 02 | train_loss 1.8042 acc 0.474 | val_loss 1.5367 acc 0.561
[Warmup] Epoch 03 | train_loss 1.7174 acc 0.502 | val_loss 1.4463 acc 0.591

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.5812 acc 0.516 | val_loss 1.1019 acc 0.676
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 02 | train_loss 1.2398 acc 0.588 | val_loss 0.9054 acc 0.708
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 03 | train_loss 1.1168 acc 0.604 | val_loss 0.8219 acc 0.714
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 04 | train_loss 1.0657 acc 0.638 | val_loss 0.7343 acc 0.744
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 05 | train_loss 1.0223 acc 0.640 | val_loss 0.7475 acc 0.745
Epoch 06 | train_loss 0.9413 acc 0.675 | val_loss 0.6998 acc 0.771
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 07 | train_loss 0.9043 acc 0.670 | val_loss 0.7406 acc 0.770
Epoch 08 | train_loss 0.8513 acc 0.690 | val_loss 0.8160 acc 0.789
Epoch 09 | train_loss 0.8335 acc 0.694 | val_loss 0.6618 acc 0.786
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 10 | train_loss 0.7930 acc 0.701 | val_loss 0.6920 acc 0.794
Epoch 11 | train_loss 0.7651 acc 0.706 | val_loss 0.7098 acc 0.814
Epoch 12 | train_loss 0.7816 acc 0.717 | val_loss 0.6938 acc 0.812
Epoch 13 | train_loss 0.6671 acc 0.741 | val_loss 0.5025 acc 0.825
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt
Epoch 14 | train_loss 0.6347 acc 0.761 | val_loss 0.5779 acc 0.842
Epoch 15 | train_loss 0.5957 acc 0.765 | val_loss 0.5490 acc 0.842
Epoch 16 | train_loss 0.6244 acc 0.757 | val_loss 0.5884 acc 0.845
Epoch 17 | train_loss 0.5686 acc 0.788 | val_loss 0.5507 acc 0.866
Epoch 18 | train_loss 0.4987 acc 0.794 | val_loss 0.6081 acc 0.863
Epoch 19 | train_loss 0.5088 acc 0.793 | val_loss 0.6266 acc 0.865
Epoch 20 | train_loss 0.5309 acc 0.791 | val_loss 0.5954 acc 0.865
Epoch 21 | train_loss 0.4948 acc 0.803 | val_loss 0.6135 acc 0.868
Epoch 22 | train_loss 0.4691 acc 0.803 | val_loss 0.5815 acc 0.878
Epoch 23 | train_loss 0.4621 acc 0.810 | val_loss 0.5898 acc 0.876
Epoch 24 | train_loss 0.4611 acc 0.806 | val_loss 0.5872 acc 0.870
Epoch 25 | train_loss 0.4647 acc 0.806 | val_loss 0.5837 acc 0.870

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242

Loaded checkpoint for eval: /content/drive/MyDrive/Lite4_Checkpoints/run_20260227_121242/efficientnet_lite4_best.pt (epoch 13)

===== VALIDATION METRICS (Lite4) =====
Balanced Accuracy : 0.8159
Macro F1          : 0.7272
Weighted F1       : 0.8359

Confusion Matrix:
        akiec  bcc  bkl  df  mel    nv  vasc
akiec     46    4    6   1    1     1     0
bcc        5   82    1   1    3     0     1
bkl       12    7  151   0   19     9     0
df         3    2    0  14    0     1     0
mel        2    4   23   0  148    19     4
nv         4   16   42  13   99  1023    10
vasc       0    0    0   0    0     0    26

Classification Report:
               precision    recall  f1-score   support

       akiec      0.639     0.780     0.702        59
         bcc      0.713     0.882     0.788        93
         bkl      0.677     0.763     0.717       198
          df      0.483     0.700     0.571        20
         mel      0.548     0.740     0.630       200
          nv      0.972     0.848     0.905      1207
        vasc      0.634     1.000     0.776        26

    accuracy                          0.826      1803
   macro avg      0.667     0.816     0.727      1803
weighted avg      0.858     0.826     0.836      1803