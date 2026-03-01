Model data_config: {'input_size': (3, 224, 224), 'interpolation': 'bicubic', 'mean': (0.485, 0.456, 0.406), 'std': (0.229, 0.224, 0.225), 'crop_pct': 0.875, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.4645 acc 0.454 | val_loss 1.5376 acc 0.647
[Warmup] Epoch 02 | train_loss 1.8005 acc 0.523 | val_loss 1.3369 acc 0.610
[Warmup] Epoch 03 | train_loss 1.6203 acc 0.529 | val_loss 1.2851 acc 0.661

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.5043 acc 0.563 | val_loss 1.0690 acc 0.612
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 02 | train_loss 1.2686 acc 0.598 | val_loss 1.0419 acc 0.742
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 03 | train_loss 1.1728 acc 0.616 | val_loss 0.7962 acc 0.744
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 04 | train_loss 1.1358 acc 0.632 | val_loss 0.7985 acc 0.747
Epoch 05 | train_loss 0.9893 acc 0.665 | val_loss 0.7776 acc 0.742
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 06 | train_loss 0.9655 acc 0.678 | val_loss 0.7317 acc 0.769
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 07 | train_loss 0.8834 acc 0.688 | val_loss 0.7591 acc 0.750
Epoch 08 | train_loss 0.8423 acc 0.690 | val_loss 0.7703 acc 0.771
Epoch 09 | train_loss 0.8747 acc 0.695 | val_loss 0.6628 acc 0.800
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 10 | train_loss 0.8127 acc 0.696 | val_loss 0.6664 acc 0.785
Epoch 11 | train_loss 0.8077 acc 0.721 | val_loss 0.7543 acc 0.835
Epoch 12 | train_loss 0.7763 acc 0.716 | val_loss 0.6962 acc 0.805
Epoch 13 | train_loss 0.6903 acc 0.752 | val_loss 0.6609 acc 0.836
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 14 | train_loss 0.6695 acc 0.753 | val_loss 0.6449 acc 0.795
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 15 | train_loss 0.6478 acc 0.758 | val_loss 0.6143 acc 0.826
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 16 | train_loss 0.6141 acc 0.765 | val_loss 0.6182 acc 0.834
Epoch 17 | train_loss 0.5878 acc 0.778 | val_loss 0.6136 acc 0.851
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 18 | train_loss 0.5511 acc 0.778 | val_loss 0.6471 acc 0.834
Epoch 19 | train_loss 0.5518 acc 0.789 | val_loss 0.6701 acc 0.849
Epoch 20 | train_loss 0.5760 acc 0.779 | val_loss 0.6072 acc 0.849
✓ Updated BEST checkpoint -> /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt
Epoch 21 | train_loss 0.5429 acc 0.788 | val_loss 0.6421 acc 0.856
Epoch 22 | train_loss 0.5276 acc 0.792 | val_loss 0.7284 acc 0.846
Epoch 23 | train_loss 0.5081 acc 0.797 | val_loss 0.6657 acc 0.863
Epoch 24 | train_loss 0.4918 acc 0.803 | val_loss 0.6731 acc 0.871
Epoch 25 | train_loss 0.4947 acc 0.809 | val_loss 0.6259 acc 0.865

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251

Loaded checkpoint for eval: /content/drive/MyDrive/MobileNetV3L_Checkpoints/run_20260301_090251/mobilenetv3_large_best.pt (epoch 20)

===== VALIDATION METRICS (MobileNetV3 Large) =====
Balanced Accuracy : 0.7911
Macro F1          : 0.7520
Weighted F1       : 0.8546

Confusion Matrix:
        akiec  bcc  bkl  df  mel    nv  vasc
akiec     43    8    6   1    1     0     0
bcc        5   81    2   1    2     2     0
bkl       18    4  145   0   18    13     0
df         7    0    0  12    1     0     0
mel        6    1   12   1  151    28     1
nv         8   15   36   3   69  1073     3
vasc       0    0    0   0    1     0    25

Classification Report:
               precision    recall  f1-score   support

       akiec      0.494     0.729     0.589        59
         bcc      0.743     0.871     0.802        93
         bkl      0.721     0.732     0.727       198
          df      0.667     0.600     0.632        20
         mel      0.621     0.755     0.682       200
          nv      0.961     0.889     0.924      1207
        vasc      0.862     0.962     0.909        26

    accuracy                          0.849      1803
   macro avg      0.724     0.791     0.752      1803
weighted avg      0.866     0.849     0.855      1803