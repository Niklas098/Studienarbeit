Model data_config: {'input_size': (3, 224, 224), 'interpolation': 'bicubic', 'mean': (0.485, 0.456, 0.406), 'std': (0.229, 0.224, 0.225), 'crop_pct': 0.875, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 3.1064 acc 0.411 | val_loss 1.6117 acc 0.592
[Warmup] Epoch 02 | train_loss 1.9360 acc 0.487 | val_loss 1.3906 acc 0.622
[Warmup] Epoch 03 | train_loss 1.7259 acc 0.501 | val_loss 1.0859 acc 0.678

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.8882 acc 0.470 | val_loss 1.5712 acc 0.645
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 02 | train_loss 1.6722 acc 0.469 | val_loss 1.1552 acc 0.696
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 03 | train_loss 1.5520 acc 0.498 | val_loss 1.1365 acc 0.517
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 04 | train_loss 1.4776 acc 0.519 | val_loss 1.1589 acc 0.670
Epoch 05 | train_loss 1.4268 acc 0.522 | val_loss 0.9879 acc 0.660
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 06 | train_loss 1.4337 acc 0.515 | val_loss 1.3177 acc 0.512
Epoch 07 | train_loss 1.3616 acc 0.547 | val_loss 1.1016 acc 0.544
Epoch 08 | train_loss 1.4049 acc 0.529 | val_loss 1.1482 acc 0.677
Epoch 09 | train_loss 1.1891 acc 0.585 | val_loss 0.8711 acc 0.698
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 10 | train_loss 1.1317 acc 0.604 | val_loss 0.8211 acc 0.704
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 11 | train_loss 1.1002 acc 0.604 | val_loss 0.8841 acc 0.703
Epoch 12 | train_loss 1.1311 acc 0.619 | val_loss 0.8126 acc 0.712
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 13 | train_loss 1.0710 acc 0.617 | val_loss 0.7917 acc 0.762
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 14 | train_loss 1.0732 acc 0.613 | val_loss 0.8660 acc 0.761
Epoch 15 | train_loss 1.0680 acc 0.622 | val_loss 0.7853 acc 0.722
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 16 | train_loss 1.0098 acc 0.634 | val_loss 0.7865 acc 0.743
Epoch 17 | train_loss 1.0477 acc 0.629 | val_loss 0.8430 acc 0.720
Epoch 18 | train_loss 1.0207 acc 0.632 | val_loss 0.8053 acc 0.710
Epoch 19 | train_loss 0.9398 acc 0.664 | val_loss 0.6875 acc 0.752
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 20 | train_loss 0.8707 acc 0.669 | val_loss 0.7042 acc 0.757
Epoch 21 | train_loss 0.8300 acc 0.679 | val_loss 0.7588 acc 0.765
Epoch 22 | train_loss 0.8572 acc 0.673 | val_loss 0.7011 acc 0.768
Epoch 23 | train_loss 0.8133 acc 0.682 | val_loss 0.6590 acc 0.760
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt
Epoch 24 | train_loss 0.7618 acc 0.698 | val_loss 0.6766 acc 0.773
Epoch 25 | train_loss 0.8132 acc 0.692 | val_loss 0.6947 acc 0.773

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929

Loaded checkpoint for eval: /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_091929/mobilenetv3_small_best.pt (epoch 23)

===== VALIDATION METRICS (MobileNetV3 small) =====
Balanced Accuracy : 0.7585
Macro F1          : 0.6343
Weighted F1       : 0.7765

Confusion Matrix:
        akiec  bcc  bkl  df  mel   nv  vasc
akiec     41   10    5   1    1    0     1
bcc        7   73    3   4    1    1     4
bkl       20    7  135   0   25   11     0
df         3    0    0  15    1    1     0
mel       11    7   15   4  130   27     6
nv        16   34   56  19  127  949     6
vasc       0    0    0   0    1    0    25

Classification Report:
               precision    recall  f1-score   support

       akiec      0.418     0.695     0.522        59
         bcc      0.557     0.785     0.652        93
         bkl      0.631     0.682     0.655       198
          df      0.349     0.750     0.476        20
         mel      0.455     0.650     0.535       200
          nv      0.960     0.786     0.864      1207
        vasc      0.595     0.962     0.735        26

    accuracy                          0.759      1803
   macro avg      0.566     0.758     0.634      1803
weighted avg      0.817     0.759     0.777      1803