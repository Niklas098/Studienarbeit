Model data_config: {'input_size': (3, 224, 224), 'interpolation': 'bicubic', 'mean': (0.485, 0.456, 0.406), 'std': (0.229, 0.224, 0.225), 'crop_pct': 0.875, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.3886 acc 0.402 | val_loss 1.7071 acc 0.573
[Warmup] Epoch 02 | train_loss 1.8904 acc 0.496 | val_loss 1.4958 acc 0.641
[Warmup] Epoch 03 | train_loss 1.8030 acc 0.510 | val_loss 1.4773 acc 0.597

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.6304 acc 0.522 | val_loss 1.0490 acc 0.607
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 02 | train_loss 1.3558 acc 0.569 | val_loss 0.9416 acc 0.740
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 03 | train_loss 1.2453 acc 0.576 | val_loss 1.0086 acc 0.689
Epoch 04 | train_loss 1.1607 acc 0.599 | val_loss 0.8578 acc 0.671
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 05 | train_loss 1.1702 acc 0.597 | val_loss 0.8206 acc 0.705
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 06 | train_loss 1.0872 acc 0.618 | val_loss 0.8936 acc 0.699
Epoch 07 | train_loss 1.0658 acc 0.618 | val_loss 0.8740 acc 0.698
Epoch 08 | train_loss 1.0560 acc 0.644 | val_loss 0.7876 acc 0.745
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 09 | train_loss 1.0203 acc 0.651 | val_loss 0.8070 acc 0.694
Epoch 10 | train_loss 0.9702 acc 0.645 | val_loss 0.7761 acc 0.764
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 11 | train_loss 0.9472 acc 0.653 | val_loss 0.8627 acc 0.760
Epoch 12 | train_loss 0.9681 acc 0.655 | val_loss 0.7390 acc 0.769
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 13 | train_loss 0.8716 acc 0.672 | val_loss 0.8100 acc 0.768
Epoch 14 | train_loss 0.9043 acc 0.679 | val_loss 0.7607 acc 0.794
Epoch 15 | train_loss 0.8989 acc 0.668 | val_loss 0.7087 acc 0.776
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 16 | train_loss 0.8179 acc 0.694 | val_loss 0.7122 acc 0.756
Epoch 17 | train_loss 0.8573 acc 0.682 | val_loss 0.7224 acc 0.757
Epoch 18 | train_loss 0.8121 acc 0.694 | val_loss 0.7053 acc 0.765
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 19 | train_loss 0.7893 acc 0.692 | val_loss 0.6555 acc 0.804
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt
Epoch 20 | train_loss 0.8098 acc 0.696 | val_loss 0.6891 acc 0.789
Epoch 21 | train_loss 0.7967 acc 0.703 | val_loss 0.7708 acc 0.785
Epoch 22 | train_loss 0.7929 acc 0.707 | val_loss 0.7796 acc 0.820
Epoch 23 | train_loss 0.7210 acc 0.719 | val_loss 0.6628 acc 0.820
Epoch 24 | train_loss 0.6693 acc 0.737 | val_loss 0.6837 acc 0.811
Epoch 25 | train_loss 0.6369 acc 0.751 | val_loss 0.6946 acc 0.809

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519

Loaded checkpoint for eval: /content/drive/MyDrive/MobileNetV2_Checkpoints/run_20260301_093519/mobilenetv2_best.pt (epoch 19)

===== VALIDATION METRICS (MobileNetV2) =====
Balanced Accuracy : 0.7733
Macro F1          : 0.6827
Weighted F1       : 0.8120

Confusion Matrix:
        akiec  bcc  bkl  df  mel    nv  vasc
akiec     50    3    3   0    3     0     0
bcc        9   76    3   1    3     0     1
bkl       11    5  145   3   16    18     0
df         5    3    1  11    0     0     0
mel        9    3   19   1  125    40     3
nv        14   25   52  15   78  1015     8
vasc       0    0    0   0    0     0    26

Classification Report:
               precision    recall  f1-score   support

       akiec      0.510     0.847     0.637        59
         bcc      0.661     0.817     0.731        93
         bkl      0.650     0.732     0.689       198
          df      0.355     0.550     0.431        20
         mel      0.556     0.625     0.588       200
          nv      0.946     0.841     0.890      1207
        vasc      0.684     1.000     0.812        26

    accuracy                          0.803      1803
   macro avg      0.623     0.773     0.683      1803
weighted avg      0.831     0.803     0.812      1803